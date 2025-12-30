import { TelemetryService } from './core/services/TelemetryService.js';
import { DeviceService } from './core/services/DeviceService.js';
import { disconnectDb } from './core/database.js';
import { MQTTServer } from './broker/mqtt-server.js';
import { APIServer } from './api/server.js';

export interface PocketMQTTConfig {
  mqttPort?: number;
  apiPort?: number;
  apiHost?: string;
  jwtSecret?: string;
}

/**
 * PocketMQTT - Lightweight API-first IoT platform.
 * Orchestrates the MQTT broker and REST API as a single monolithic process.
 * 
 * This is the main entry point that coordinates:
 * - API Server (Fastify + REST endpoints)
 * - Broker Server (Aedes + MQTT protocol)
 * - Core Services (TelemetryService, DeviceService)
 */
export class PocketMQTT {
  private mqttServer: MQTTServer;
  private apiServer: APIServer;
  private telemetryService: TelemetryService;
  private deviceService: DeviceService;

  constructor(config: PocketMQTTConfig = {}) {
    const maxPayloadSize = 64 * 1024; // 64KB max payload size
    
    // Initialize core services
    this.telemetryService = new TelemetryService();
    
    // Initialize API server first to get logger
    this.apiServer = new APIServer(
      this.telemetryService,
      // DeviceService will be initialized below with API logger
      {} as DeviceService,
      {
        port: config.apiPort,
        host: config.apiHost,
        jwtSecret: config.jwtSecret,
        maxPayloadSize
      }
    );
    
    // Initialize DeviceService with API logger
    this.deviceService = new DeviceService(undefined, this.apiServer.getFastify().log);
    
    // Inject DeviceService into APIServer (workaround for circular dependency)
    // This is safe because we haven't started the server yet
    Object.defineProperty(this.apiServer, 'deviceService', {
      value: this.deviceService,
      writable: false
    });
    
    // Initialize MQTT server
    this.mqttServer = new MQTTServer(this.telemetryService, {
      port: config.mqttPort,
      maxPayloadSize
    });
  }

  /**
   * Start both the MQTT broker and API server.
   */
  async start(): Promise<void> {
    // Start MQTT broker
    await this.mqttServer.start(this.apiServer.getFastify().log);
    
    // Start API server
    await this.apiServer.start();
  }

  /**
   * Stop both servers and clean up all resources.
   */
  async stop(): Promise<void> {
    const errors: Error[] = [];

    // Stop telemetry service first (flushes any pending messages)
    try {
      await this.telemetryService.stop();
    } catch (err) {
      errors.push(err instanceof Error ? err : new Error(String(err)));
    }

    // Stop API server
    try {
      await this.apiServer.stop();
    } catch (err) {
      errors.push(err instanceof Error ? err : new Error(String(err)));
    }
    
    // Stop MQTT server
    try {
      await this.mqttServer.stop();
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
