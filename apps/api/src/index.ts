#!/usr/bin/env node
/**
 * PocketMQTT API Executable
 * 
 * Starts the REST API server with all services.
 * This is the main entry point for running the API server.
 */

import 'dotenv/config';
import { APIServer } from '@pocket-mqtt/api';
import { TelemetryService } from '@pocket-mqtt/telemetry-service';
import { DeviceService, TenantService, UserService } from '@pocket-mqtt/api';
import { disconnectDb } from '@pocket-mqtt/db';

const maxPayloadSize = 64 * 1024; // 64KB max payload size

// Initialize core services
const telemetryService = new TelemetryService();
const deviceService = new DeviceService();
const tenantService = new TenantService();
const userService = new UserService();

// Initialize API server with the services
const apiServer = new APIServer(
  telemetryService,
  deviceService,
  tenantService,
  userService,
  {
    port: process.env.API_PORT ? parseInt(process.env.API_PORT) : 3000,
    host: process.env.API_HOST || '0.0.0.0',
    jwtSecret: process.env.JWT_SECRET,
    maxPayloadSize
  }
);

// Attach Fastify logger to the services after initialization
deviceService.setLogger(apiServer.getLogger());
tenantService.setLogger(apiServer.getLogger());

// Start the API server
apiServer.start().catch((err) => {
  console.error('Failed to start API server:', err);
  process.exit(1);
});

// Graceful shutdown
const shutdown = async () => {
  console.log('\nShutting down API server...');
  
  const errors: Error[] = [];

  // Stop telemetry service first (flushes any pending messages)
  try {
    await telemetryService.stop();
  } catch (err) {
    errors.push(err instanceof Error ? err : new Error(String(err)));
  }

  // Stop API server
  try {
    await apiServer.stop();
  } catch (err) {
    errors.push(err instanceof Error ? err : new Error(String(err)));
  }

  // Disconnect database
  try {
    await disconnectDb();
  } catch (err) {
    errors.push(err instanceof Error ? err : new Error(String(err)));
  }

  // If there were any errors during shutdown, log them
  if (errors.length > 0) {
    console.error('Errors occurred during shutdown:', errors);
    process.exit(1);
  }
  
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
