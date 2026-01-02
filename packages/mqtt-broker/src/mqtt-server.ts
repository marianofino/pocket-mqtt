import Aedes from 'aedes';
import { createServer } from 'net';
import type { Server as NetServer } from 'net';
import type { TelemetryService } from '@pocket/telemetry-service';
import { setupMQTTAuthentication } from './authentication.js';
import { setupMQTTHandlers } from './handlers.js';

export interface MQTTServerConfig {
  port?: number;
  maxPayloadSize?: number;
}

/**
 * MQTT Server wrapper for Aedes broker.
 * Handles broker lifecycle, authentication, and message handling.
 */
export class MQTTServer {
  private aedes: Aedes;
  private server: NetServer | null = null;
  private port: number;
  private maxPayloadSize: number;

  constructor(
    private telemetryService: TelemetryService,
    config: MQTTServerConfig = {}
  ) {
    this.port = config.port ?? 1883;
    this.maxPayloadSize = config.maxPayloadSize ?? 64 * 1024; // 64KB default
    this.aedes = new Aedes();
    
    // Setup authentication and handlers
    setupMQTTAuthentication(this.aedes);
    setupMQTTHandlers(this.aedes, this.telemetryService, this.maxPayloadSize);
  }

  /**
   * Get the Aedes instance for direct access if needed.
   */
  getAedes(): Aedes {
    return this.aedes;
  }

  /**
   * Start the MQTT broker on the configured port.
   */
  async start(logger?: { info: (msg: string) => void }): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = createServer(this.aedes.handle);
      
      this.server.listen(this.port, (err?: Error) => {
        if (err) {
          reject(err);
        } else {
          if (logger) {
            logger.info(`MQTT broker listening on port ${this.port}`);
          }
          resolve();
        }
      });
    });
  }

  /**
   * Stop the MQTT broker and clean up resources.
   */
  async stop(): Promise<void> {
    const errors: Error[] = [];

    // Close TCP server
    if (this.server) {
      try {
        await new Promise<void>((resolve, reject) => {
          this.server!.close((err) => {
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
      throw new AggregateError(errors, 'Errors occurred during MQTT server shutdown');
    }
  }
}
