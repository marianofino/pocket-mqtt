import Aedes from 'aedes';
import { createServer } from 'net';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import type { Server as NetServer } from 'net';
import { TelemetryService } from './services/TelemetryService.js';
import { disconnectPrisma } from './database.js';

export interface PocketMQTTConfig {
  mqttPort?: number;
  apiPort?: number;
  apiHost?: string;
}

export class PocketMQTT {
  private mqttPort: number;
  private apiPort: number;
  private apiHost: string;
  private aedes: Aedes;
  private mqttServer: NetServer | null = null;
  private fastify: FastifyInstance;
  private telemetryService: TelemetryService;

  constructor(config: PocketMQTTConfig = {}) {
    this.mqttPort = config.mqttPort ?? 1883;
    this.apiPort = config.apiPort ?? 3000;
    this.apiHost = config.apiHost ?? '127.0.0.1';
    
    // Initialize Aedes MQTT broker
    this.aedes = new Aedes();
    
    // Initialize Telemetry service
    this.telemetryService = new TelemetryService();
    
    // Hook into MQTT publish events to buffer telemetry
    this.setupMQTTHandlers();
    
    // Initialize Fastify API
    this.fastify = Fastify({
      logger: true
    });
    
    this.setupRoutes();
  }

  private setupMQTTHandlers(): void {
    // Listen to published messages and buffer them for telemetry
    this.aedes.on('publish', async (packet, client) => {
      // Skip system topics (starting with $)
      if (packet.topic.startsWith('$')) {
        return;
      }
      
      // Buffer the message for batch writing
      await this.telemetryService.addMessage(
        packet.topic,
        packet.payload.toString()
      );
    });
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.fastify.get('/health', async () => {
      return { status: 'ok' };
    });

    // POST /api/v1/telemetry - Submit telemetry data
    this.fastify.post('/api/v1/telemetry', async (request, reply) => {
      const body = request.body as { topic: string; payload: string };
      
      if (!body.topic || !body.payload) {
        reply.code(400).send({ error: 'topic and payload are required' });
        return;
      }

      await this.telemetryService.addMessage(body.topic, body.payload);
      
      return { success: true, message: 'Telemetry data buffered' };
    });

    // GET /api/v1/telemetry - Retrieve telemetry data
    this.fastify.get('/api/v1/telemetry', async (request, reply) => {
      const query = request.query as { topic?: string; limit?: string; offset?: string };
      
      const limit = query.limit ? parseInt(query.limit, 10) : 100;
      const offset = query.offset ? parseInt(query.offset, 10) : 0;

      const prisma = this.telemetryService.getPrisma();
      
      const where = query.topic ? { topic: query.topic } : {};
      
      const telemetry = await prisma.telemetry.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip: offset,
      });

      const total = await prisma.telemetry.count({ where });

      return {
        data: telemetry,
        pagination: {
          total,
          limit,
          offset,
        },
      };
    });
  }

  async start(): Promise<void> {
    // Start MQTT broker
    await this.startMQTTBroker();
    
    // Start Fastify API
    await this.startAPI();
  }

  private async startMQTTBroker(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.mqttServer = createServer(this.aedes.handle);
      
      this.mqttServer.listen(this.mqttPort, (err?: Error) => {
        if (err) {
          reject(err);
        } else {
          this.fastify.log.info(`MQTT broker listening on port ${this.mqttPort}`);
          resolve();
        }
      });
    });
  }

  private async startAPI(): Promise<void> {
    try {
      await this.fastify.listen({ port: this.apiPort, host: this.apiHost });
      this.fastify.log.info(`Fastify API listening on ${this.apiHost}:${this.apiPort}`);
    } catch (err) {
      const message = `Failed to start Fastify API on ${this.apiHost}:${this.apiPort}`;
      if (err instanceof Error) {
        throw new Error(message, { cause: err });
      }
      throw new Error(`${message}: ${String(err)}`);
    }
  }

  async stop(): Promise<void> {
    const errors: Error[] = [];

    // Stop telemetry service first (flushes any pending messages)
    try {
      await this.telemetryService.stop();
    } catch (err) {
      errors.push(err instanceof Error ? err : new Error(String(err)));
    }

    // Close Fastify API
    try {
      await this.fastify.close();
    } catch (err) {
      errors.push(err instanceof Error ? err : new Error(String(err)));
    }
    
    // Close MQTT broker
    if (this.mqttServer) {
      try {
        await new Promise<void>((resolve, reject) => {
          this.mqttServer!.close((err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      } catch (err) {
        errors.push(err instanceof Error ? err : new Error(String(err)));
      }
    }
    
    // Close Aedes
    try {
      await new Promise<void>((resolve) => {
        this.aedes.close(() => {
          resolve();
        });
      });
    } catch (err) {
      errors.push(err instanceof Error ? err : new Error(String(err)));
    }

    // Disconnect Prisma
    try {
      await disconnectPrisma();
    } catch (err) {
      errors.push(err instanceof Error ? err : new Error(String(err)));
    }

    // If there were any errors during shutdown, throw an aggregate error
    if (errors.length > 0) {
      throw new AggregateError(errors, 'Errors occurred during shutdown');
    }
  }
}

// Main entry point for direct execution
import { fileURLToPath } from 'url';
import { resolve } from 'path';

const currentFile = fileURLToPath(import.meta.url);
const mainFile = resolve(process.argv[1]);

if (currentFile === mainFile) {
  const app = new PocketMQTT();
  
  app.start().catch((err) => {
    console.error('Failed to start PocketMQTT:', err);
    process.exit(1);
  });

  // Graceful shutdown
  const shutdown = async () => {
    console.log('\nShutting down PocketMQTT...');
    await app.stop();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
