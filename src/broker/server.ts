import Aedes from 'aedes';
import type { AuthenticateError, Client, PublishPacket } from 'aedes';
import { createServer } from 'net';
import type { Server as NetServer } from 'net';
import { getDbClient, getDbAdapter } from '../core/database.js';
import { deviceToken as deviceTokenSchema } from '../core/db/schema.js';
import { deviceToken as deviceTokenSchemaPg } from '../core/db/schema.pg.js';
import { eq } from 'drizzle-orm';
import { MqttPayloadSchema } from '../core/validation/mqtt-payload.schema.js';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type * as schemaSqlite from '../core/db/schema.js';
import type * as schemaPg from '../core/db/schema.pg.js';
import type { TelemetryService } from '../services/TelemetryService.js';

type SqliteDbClient = BetterSQLite3Database<typeof schemaSqlite>;
type PostgresDbClient = PostgresJsDatabase<typeof schemaPg>;

export interface BrokerServerConfig {
  port?: number;
  maxPayloadSize?: number;
  telemetryService: TelemetryService;
}

/**
 * MQTT Broker Server
 * Handles MQTT connections, authentication, and message publishing
 */
export class BrokerServer {
  private port: number;
  private aedes: Aedes;
  private mqttServer: NetServer | null = null;
  private telemetryService: TelemetryService;
  private readonly maxPayloadSize: number;

  constructor(config: BrokerServerConfig) {
    this.port = config.port ?? 1883;
    this.maxPayloadSize = config.maxPayloadSize ?? 64 * 1024; // 64KB max payload size
    this.telemetryService = config.telemetryService;
    
    // Initialize Aedes MQTT broker
    this.aedes = new Aedes();
    
    // Setup MQTT authentication hooks
    this.setupMQTTAuthentication();
    
    // Hook into MQTT publish events to buffer telemetry
    this.setupMQTTHandlers();
  }

  /**
   * Setup MQTT authentication hooks to validate device tokens
   */
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

  /**
   * Setup MQTT message handlers to buffer telemetry
   */
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

  /**
   * Start the MQTT broker server
   */
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.mqttServer = createServer(this.aedes.handle);
      
      this.mqttServer.listen(this.port, (err?: Error) => {
        if (err) {
          reject(err);
        } else {
          console.log(`MQTT broker listening on port ${this.port}`);
          resolve();
        }
      });
    });
  }

  /**
   * Stop the MQTT broker server
   */
  async stop(): Promise<void> {
    const errors: Error[] = [];

    // Close MQTT server
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

    if (errors.length > 0) {
      throw new AggregateError(errors, 'Errors occurred during broker shutdown');
    }
  }
}
