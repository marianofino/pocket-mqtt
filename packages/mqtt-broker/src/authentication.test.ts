import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import mqtt from 'mqtt';
import { resolve } from 'node:path';
import { existsSync, unlinkSync } from 'node:fs';
import { MQTTServer } from '../src/mqtt-server.js';
import { TelemetryService } from '@pocket-mqtt/telemetry-service';
import { DeviceService } from '@pocket-mqtt/api';
import { createTenantRepository, createDeviceRepository, resetDbClient, getDbClient } from '@pocket-mqtt/db';

const TEST_DB_PATH = resolve('mqtt-auth-test.db');
const TEST_DB_URL = `file:${TEST_DB_PATH}`;

/**
 * Integration tests for MQTT authentication modes.
 * Tests both legacy (deviceId+token) and new (token-only) authentication.
 */
describe('MQTT Authentication Integration', () => {
  let mqttServer: MQTTServer;
  let deviceService: DeviceService;
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

    // Create a test device
    const deviceRepo = createDeviceRepository();
    deviceService = new DeviceService(deviceRepo);
    const device = await deviceService.createDevice({
      tenantId: tenant.id,
      name: 'Test Device',
    });

    testDevice = {
      deviceId: device.deviceId,
      token: device.token,
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

  describe('Legacy Authentication (deviceId + token)', () => {
    it('should authenticate with valid deviceId as username and token as password', () => {
      return new Promise<void>((resolve, reject) => {
        const client = mqtt.connect(`mqtt://localhost:${port}`, {
          clientId: 'test-client-legacy',
          username: testDevice.deviceId,
          password: testDevice.token,
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

    it('should reject invalid deviceId', () => {
      return new Promise<void>((resolve, reject) => {
        const client = mqtt.connect(`mqtt://localhost:${port}`, {
          clientId: 'test-client-invalid-deviceid',
          username: 'invalid-device-id',
          password: testDevice.token,
          clean: true,
          reconnectPeriod: 0,
        });

        client.on('connect', () => {
          client.end();
          reject(new Error('Should not have connected with invalid deviceId'));
        });

        client.on('error', () => {
          client.end();
          resolve();
        });
      });
    });

    it('should reject invalid token', () => {
      return new Promise<void>((resolve, reject) => {
        const client = mqtt.connect(`mqtt://localhost:${port}`, {
          clientId: 'test-client-invalid-token',
          username: testDevice.deviceId,
          password: 'invalid-token',
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
      // Regenerate the token
      const deviceRecord = await deviceService.getDeviceByDeviceId(testDevice.deviceId);
      if (!deviceRecord) {
        throw new Error('Device not found');
      }

      const updatedDevice = await deviceService.regenerateToken(deviceRecord.id);
      if (!updatedDevice) {
        throw new Error('Failed to regenerate token');
      }

      const newToken = updatedDevice.token;

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
