import Aedes from 'aedes';
import { createServer } from 'net';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import type { Server as NetServer } from 'net';

export interface PocketMQTTConfig {
  mqttPort?: number;
  apiPort?: number;
}

export class PocketMQTT {
  private mqttPort: number;
  private apiPort: number;
  private aedes: Aedes;
  private mqttServer: NetServer | null = null;
  private fastify: FastifyInstance;

  constructor(config: PocketMQTTConfig = {}) {
    this.mqttPort = config.mqttPort ?? 1883;
    this.apiPort = config.apiPort ?? 3000;
    
    // Initialize Aedes MQTT broker
    this.aedes = new Aedes();
    
    // Initialize Fastify API
    this.fastify = Fastify({
      logger: false
    });
    
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.fastify.get('/health', async () => {
      return { status: 'ok' };
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
          console.log(`MQTT broker listening on port ${this.mqttPort}`);
          resolve();
        }
      });
    });
  }

  private async startAPI(): Promise<void> {
    try {
      await this.fastify.listen({ port: this.apiPort, host: '0.0.0.0' });
      console.log(`Fastify API listening on port ${this.apiPort}`);
    } catch (err) {
      throw err;
    }
  }

  async stop(): Promise<void> {
    // Close Fastify API
    await this.fastify.close();
    
    // Close MQTT broker
    if (this.mqttServer) {
      await new Promise<void>((resolve) => {
        this.mqttServer!.close(() => {
          resolve();
        });
      });
    }
    
    // Close Aedes
    await new Promise<void>((resolve) => {
      this.aedes.close(() => {
        resolve();
      });
    });
  }
}

// Main entry point for direct execution
if (import.meta.url === `file://${process.argv[1]}`) {
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
