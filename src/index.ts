import Aedes from 'aedes';
import type { AuthenticateError, Client, PublishPacket } from 'aedes';
import { createServer } from 'net';
import Fastify from 'fastify';
import fastifyJwt from '@fastify/jwt';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { Server as NetServer } from 'net';
import { TelemetryService } from './services/TelemetryService.js';
import { DeviceService } from './services/DeviceService.js';
import { disconnectDb, getDbClient, getDbAdapter } from './database.js';
import { deviceToken as deviceTokenSchema } from './db/schema.js';
import { deviceToken as deviceTokenSchemaPg } from './db/schema.pg.js';
import { eq } from 'drizzle-orm';
import { MqttPayloadSchema } from './validation/mqtt-payload.schema.js';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type * as schemaSqlite from './db/schema.js';
import type * as schemaPg from './db/schema.pg.js';
import { registerRoutes } from './api/routes/index.js';

type SqliteDbClient = BetterSQLite3Database<typeof schemaSqlite>;
type PostgresDbClient = PostgresJsDatabase<typeof schemaPg>;

export interface PocketMQTTConfig {
  mqttPort?: number;
  apiPort?: number;
  apiHost?: string;
  jwtSecret?: string;
}

export class PocketMQTT {
  private mqttPort: number;
  private apiPort: number;
  private apiHost: string;
  private aedes: Aedes;
  private mqttServer: NetServer | null = null;
  private fastify: FastifyInstance;
  private telemetryService: TelemetryService;
  private deviceService: DeviceService;
  private readonly maxPayloadSize = 64 * 1024; // 64KB max payload size
  private jwtSecret: string;

  constructor(config: PocketMQTTConfig = {}) {
    this.mqttPort = config.mqttPort ?? 1883;
    this.apiPort = config.apiPort ?? 3000;
    this.apiHost = config.apiHost ?? '127.0.0.1';
    
    // Get JWT secret from config, environment, or generate a warning
    const providedSecret = config.jwtSecret ?? process.env.JWT_SECRET;
    if (!providedSecret) {
      console.warn('WARNING: No JWT_SECRET provided. Using a default secret for development only. This is NOT secure for production!');
      this.jwtSecret = 'dev-secret-please-change-in-production';
    } else {
      this.jwtSecret = providedSecret;
    }
    
    // Initialize Aedes MQTT broker
    this.aedes = new Aedes();
    
    // Initialize services
    this.telemetryService = new TelemetryService();
    this.deviceService = new DeviceService();
    
    // Setup MQTT authentication hooks
    this.setupMQTTAuthentication();
    
    // Hook into MQTT publish events to buffer telemetry
    this.setupMQTTHandlers();
    
    // Initialize Fastify API
    this.fastify = Fastify({
      logger: true
    });
    
    // Setup JWT authentication
    this.setupJWT();
    
    this.setupRoutes();
  }

  private setupMQTTAuthentication(): void {
    const adapter = getDbAdapter();
    
    // Authenticate hook - validates device tokens on connection
    this.aedes.authenticate = async (_client: Client, username: string | undefined, password: Buffer | undefined, callback: (error: AuthenticateError | null, success: boolean) => void) => {
      // Reject connections without credentials
      if (!username || !password) {
        callback(null, false);
        return;
      }

      try {
        const token = password.toString();
        
        // Look up device token in database based on adapter
        let deviceTokenRecord: { deviceId: string; token: string; expiresAt: Date | null } | undefined;
        if (adapter === 'postgres') {
          const db = getDbClient() as PostgresDbClient;
          const results = await db.select()
            .from(deviceTokenSchemaPg)
            .where(eq(deviceTokenSchemaPg.token, token))
            .limit(1);
          deviceTokenRecord = results[0];
        } else {
          const db = getDbClient() as SqliteDbClient;
          const results = await db.select()
            .from(deviceTokenSchema)
            .where(eq(deviceTokenSchema.token, token))
            .limit(1);
          deviceTokenRecord = results[0];
        }

        if (!deviceTokenRecord) {
          callback(null, false);
          return;
        }

        // Check if token matches the device ID
        if (deviceTokenRecord.deviceId !== username) {
          callback(null, false);
          return;
        }

        // Check if token is expired
        if (deviceTokenRecord.expiresAt && deviceTokenRecord.expiresAt < new Date()) {
          callback(null, false);
          return;
        }

        // Authentication successful
        callback(null, true);
      } catch (error) {
        console.error('MQTT authentication error:', error);
        callback(null, false);
      }
    };

    // Authorize publish hook - validates device can publish to topic
    this.aedes.authorizePublish = async (_client: Client | null, _packet: PublishPacket, callback: (error?: Error | null) => void) => {
      // Allow publish if client is authenticated
      // Additional authorization logic could be added here (e.g., topic-based permissions)
      callback(null);
    };
  }

  private setupMQTTHandlers(): void {
    // Listen to published messages and buffer them for telemetry
    this.aedes.on('publish', (packet, _client) => {
      // Skip system topics (starting with $)
      if (packet.topic.startsWith('$')) {
        return;
      }
      
      // Validate payload size to prevent memory issues
      const payloadSize = packet.payload.length;
      if (payloadSize > this.maxPayloadSize) {
        console.warn(`Rejected MQTT message on topic ${packet.topic}: payload size ${payloadSize} exceeds max ${this.maxPayloadSize}`);
        return;
      }
      
      const payloadString = packet.payload.toString();
      
      // Validate message with Zod schema
      const validation = MqttPayloadSchema.safeParse({
        topic: packet.topic,
        payload: payloadString,
      });
      
      if (!validation.success) {
        console.warn(`Rejected MQTT message on topic ${packet.topic}: validation failed`, validation.error.issues);
        return;
      }
      
      // Buffer the message for batch writing (fire and forget for performance)
      this.telemetryService.addMessage(
        packet.topic,
        payloadString
      ).catch(err => {
        // Log errors but don't block MQTT message flow
        console.error('Error buffering telemetry message:', err);
      });
    });
  }

  private setupJWT(): void {
    // Register JWT plugin
    this.fastify.register(fastifyJwt, {
      secret: this.jwtSecret
    });

    // Add authentication decorator
    this.fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await request.jwtVerify();
      } catch (err) {
        reply.code(401).send({ error: 'Unauthorized' });
      }
    });
  }

  private setupRoutes(): void {
    // Register all routes using the modular plugin system
    this.fastify.register(registerRoutes, {
      telemetryService: this.telemetryService,
      deviceService: this.deviceService,
      maxPayloadSize: this.maxPayloadSize
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

    // Disconnect database
    try {
      await disconnectDb();
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
