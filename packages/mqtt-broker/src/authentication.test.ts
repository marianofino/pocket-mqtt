import { describe, it, beforeAll, afterAll, vi } from 'vitest';
import mqtt from 'mqtt';
import { resolve } from 'node:path';
import { existsSync, unlinkSync } from 'node:fs';
import { MQTTServer } from '../src/mqtt-server.js';
import { TelemetryService } from '@pocket-mqtt/telemetry-service';
import { createTenantRepository, createDeviceRepository, resetDbClient, getDbClient } from '@pocket-mqtt/db';
import { generateTokenLookup, hashDeviceToken } from '@pocket-mqtt/core';

const TEST_DB_PATH = resolve('mqtt-auth-test.db');
const TEST_DB_URL = `file:${TEST_DB_PATH}`;

/**
 * Integration tests for MQTT authentication.
 * Tests single-credential (token-only) authentication.
 */
describe('MQTT Authentication Integration', () => {
  let mqttServer: MQTTServer;
  const port = 11883; // Use different port to avoid conflicts
  let testDevice: { deviceId: string; token: string; tenantId: number };

  beforeAll(async () => {
    // Set up test database
    vi.stubEnv('DATABASE_URL', TEST_DB_URL);
    vi.stubEnv('DB_ADAPTER', 'sqlite');
    if (existsSync(TEST_DB_PATH)) {
      unlinkSync(TEST_DB_PATH);
    }
    await resetDbClient();

    // Get database client and create tables manually for test
    const db = getDbClient() as any;
    const sqlite = db.$client; // Access underlying better-sqlite3 instance
    
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS Tenant (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        name TEXT NOT NULL UNIQUE,
        apiKey TEXT NOT NULL UNIQUE,
        createdAt INTEGER NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS DeviceToken (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        tenantId INTEGER NOT NULL,
        deviceId TEXT NOT NULL UNIQUE,
        tokenHash TEXT NOT NULL,
        tokenLookup TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        labels TEXT,
        notes TEXT,
        createdAt INTEGER NOT NULL,
        expiresAt INTEGER,
        FOREIGN KEY (tenantId) REFERENCES Tenant(id)
      );
      
      CREATE INDEX IF NOT EXISTS DeviceToken_deviceId_idx ON DeviceToken(deviceId);
      CREATE INDEX IF NOT EXISTS DeviceToken_tenantId_idx ON DeviceToken(tenantId);
      CREATE INDEX IF NOT EXISTS DeviceToken_tokenLookup_idx ON DeviceToken(tokenLookup);
      
      CREATE TABLE IF NOT EXISTS Telemetry (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        tenantId INTEGER NOT NULL,
        topic TEXT NOT NULL,
        payload TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        FOREIGN KEY (tenantId) REFERENCES Tenant(id)
      );
    `);

    // Create a test tenant
    const tenantRepo = createTenantRepository();
    const tenant = await tenantRepo.create({
      name: 'auth-test-tenant',
      apiKey: 'test-api-key-123',
    });

    // Create a test device directly using repository
    const deviceRepo = createDeviceRepository();
    const plaintextToken = 'test-token-123';
    const deviceId = 'device-test-001';
    const tokenHash = await hashDeviceToken(plaintextToken);
    const tokenLookup = generateTokenLookup(plaintextToken);
    
    const device = await deviceRepo.create({
      tenantId: tenant.id,
      deviceId,
      tokenHash,
      tokenLookup,
      name: 'Test Device',
      labels: null,
      notes: null,
    });

    testDevice = {
      deviceId: device.deviceId,
      token: plaintextToken,
      tenantId: tenant.id,
    };

    // Start MQTT broker
    const telemetryService = new TelemetryService();
    mqttServer = new MQTTServer(telemetryService, { port });
    await mqttServer.start({ info: () => {} } as any);
  });

  afterAll(async () => {
    if (mqttServer) {
      await mqttServer.stop();
    }
    
    // Clean up database
    await resetDbClient();
    if (existsSync(TEST_DB_PATH)) {
      unlinkSync(TEST_DB_PATH);
    }
    vi.unstubAllEnvs();
  });

  describe('Single-Credential Authentication (token only)', () => {
    it('should authenticate with token as username and no password', () => {
      return new Promise<void>((resolve, reject) => {
        const client = mqtt.connect(`mqtt://localhost:${port}`, {
          clientId: 'test-client-single-cred',
          username: testDevice.token,
          // No password provided
          clean: true,
          reconnectPeriod: 0,
        });

        client.on('connect', () => {
          client.end();
          resolve();
        });

        client.on('error', (err) => {
          client.end();
          reject(new Error(`Connection failed: ${err.message}`));
        });
      });
    });

    it('should reject invalid token in single-credential mode', () => {
      return new Promise<void>((resolve, reject) => {
        const client = mqtt.connect(`mqtt://localhost:${port}`, {
          clientId: 'test-client-invalid-single-cred',
          username: 'invalid-token-xyz',
          clean: true,
          reconnectPeriod: 0,
        });

        client.on('connect', () => {
          client.end();
          reject(new Error('Should not have connected with invalid token'));
        });

        client.on('error', () => {
          client.end();
          resolve();
        });
      });
    });

    it('should handle token rotation in single-credential mode', async () => {
      // Regenerate the token directly using repository
      const deviceRepo = createDeviceRepository();
      const deviceRecord = await deviceRepo.findByDeviceId(testDevice.deviceId);
      if (!deviceRecord) {
        throw new Error('Device not found');
      }

      const newToken = 'new-test-token-456';
      const newTokenHash = await hashDeviceToken(newToken);
      const newTokenLookup = generateTokenLookup(newToken);

      const updatedDevice = await deviceRepo.update(deviceRecord.id, {
        tokenHash: newTokenHash,
        tokenLookup: newTokenLookup,
      });

      if (!updatedDevice) {
        throw new Error('Failed to update token');
      }

      return new Promise<void>((resolve, reject) => {
        // Try connecting with new token
        const client = mqtt.connect(`mqtt://localhost:${port}`, {
          clientId: 'test-client-rotated-token',
          username: newToken,
          clean: true,
          reconnectPeriod: 0,
        });

        client.on('connect', () => {
          client.end();
          resolve();
        });

        client.on('error', (err) => {
          client.end();
          reject(new Error(`Connection failed after token rotation: ${err.message}`));
        });
      });
    });
  });
});
