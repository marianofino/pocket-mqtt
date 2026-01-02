#!/usr/bin/env node
/**
 * PocketMQTT Broker Executable
 * 
 * Starts the MQTT broker (MQTT→DB without REST).
 * This is a standalone MQTT broker that stores telemetry directly to the database.
 */

import 'dotenv/config';
import { MQTTServer } from '@pocket/mqtt-broker';
import { TelemetryService } from '@pocket/telemetry-service';
import { disconnectDb } from '@pocket/db';

const maxPayloadSize = 64 * 1024; // 64KB max payload size

// Initialize telemetry service
const telemetryService = new TelemetryService();

// Initialize MQTT server
const mqttServer = new MQTTServer(telemetryService, {
  port: process.env.MQTT_PORT ? parseInt(process.env.MQTT_PORT) : 1883,
  maxPayloadSize
});

// Create a simple console logger for the broker
const logger = {
  info: (msg: string, ...args: unknown[]) => console.log(`[INFO] ${msg}`, ...args),
  error: (msg: string, ...args: unknown[]) => console.error(`[ERROR] ${msg}`, ...args),
  warn: (msg: string, ...args: unknown[]) => console.warn(`[WARN] ${msg}`, ...args),
  debug: (msg: string, ...args: unknown[]) => console.debug(`[DEBUG] ${msg}`, ...args),
};

// Start the MQTT broker
mqttServer.start(logger).catch((err) => {
  console.error('Failed to start MQTT broker:', err);
  process.exit(1);
});

// Graceful shutdown
const shutdown = async () => {
  console.log('\nShutting down MQTT broker...');
  
  const errors: Error[] = [];

  // Stop telemetry service first (flushes any pending messages)
  try {
    await telemetryService.stop();
  } catch (err) {
    errors.push(err instanceof Error ? err : new Error(String(err)));
  }

  // Stop MQTT server
  try {
    await mqttServer.stop();
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
