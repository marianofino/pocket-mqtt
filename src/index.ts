import { TelemetryService } from './services/TelemetryService.js';
import { disconnectDb } from './core/database.js';
import { BrokerServer } from './broker/server.js';
import { ApiServer } from './api/server.js';

export interface PocketMQTTConfig {
  mqttPort?: number;
  apiPort?: number;
  apiHost?: string;
  jwtSecret?: string;
}

/**
 * PocketMQTT - Monolithic orchestrator for API + Broker
 * Manages the lifecycle of both the MQTT broker and REST API servers
 */
export class PocketMQTT {
  private brokerServer: BrokerServer;
  private apiServer: ApiServer;
  private telemetryService: TelemetryService;
  private readonly maxPayloadSize = 64 * 1024; // 64KB max payload size

  constructor(config: PocketMQTTConfig = {}) {
    // Initialize shared Telemetry service
    this.telemetryService = new TelemetryService();
    
    // Initialize MQTT Broker Server
    this.brokerServer = new BrokerServer({
      port: config.mqttPort,
      maxPayloadSize: this.maxPayloadSize,
      telemetryService: this.telemetryService
    });
    
    // Initialize API Server
    this.apiServer = new ApiServer({
      port: config.apiPort,
      host: config.apiHost,
      jwtSecret: config.jwtSecret,
      telemetryService: this.telemetryService,
      maxPayloadSize: this.maxPayloadSize
    });
  }

  /**
   * Start both MQTT broker and API server
   */
  async start(): Promise<void> {
    // Start MQTT broker
    await this.brokerServer.start();
    
    // Start Fastify API
    await this.apiServer.start();
  }

  /**
   * Stop both servers and clean up resources
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
    
    // Stop MQTT broker
    try {
      await this.brokerServer.stop();
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
