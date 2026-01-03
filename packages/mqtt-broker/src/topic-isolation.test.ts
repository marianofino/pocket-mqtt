import { describe, it, beforeAll, afterAll, expect, vi } from 'vitest';
import mqtt from 'mqtt';
import { resolve } from 'node:path';
import { existsSync, unlinkSync } from 'node:fs';
import { MQTTServer } from './mqtt-server.js';
import { TelemetryService } from '@pocket-mqtt/telemetry-service';
import { createTenantRepository, createDeviceRepository, resetDbClient, getDbClient } from '@pocket-mqtt/db';
import { generateTokenLookup, hashDeviceToken } from '@pocket-mqtt/core';

const TEST_DB_PATH = resolve('mqtt-topic-isolation-test.db');
const TEST_DB_URL = `file:${TEST_DB_PATH}`;

/**
 * Integration tests for multi-tenant topic isolation.
 * Tests that topic rewriting and MQTT reserved topic blocking work correctly.
 */
describe('Multi-Tenant Topic Isolation Integration', () => {
  let mqttServer: MQTTServer;
  const port = 11884; // Use different port to avoid conflicts
  let tenantA: { id: number };
  let tenantB: { id: number };
  let deviceA: { deviceId: string; token: string; tenantId: number };
  let deviceB: { deviceId: string; token: string; tenantId: number };

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

    // Create test tenants
    const tenantRepo = createTenantRepository();
    tenantA = await tenantRepo.create({
      name: 'tenant-a',
      apiKey: 'test-api-key-tenant-a',
    });
    tenantB = await tenantRepo.create({
      name: 'tenant-b',
      apiKey: 'test-api-key-tenant-b',
    });

    // Create test devices for each tenant
    const deviceRepo = createDeviceRepository();
    
    // Device for Tenant A
    const tokenA = 'token-tenant-a-001';
    const deviceIdA = 'device-tenant-a-001';
    const tokenHashA = await hashDeviceToken(tokenA);
    const tokenLookupA = generateTokenLookup(tokenA);
    
    const devA = await deviceRepo.create({
      tenantId: tenantA.id,
      deviceId: deviceIdA,
      tokenHash: tokenHashA,
      tokenLookup: tokenLookupA,
      name: 'Device A',
      labels: null,
      notes: null,
    });

    deviceA = {
      deviceId: devA.deviceId,
      token: tokenA,
      tenantId: tenantA.id,
    };

    // Device for Tenant B
    const tokenB = 'token-tenant-b-001';
    const deviceIdB = 'device-tenant-b-001';
    const tokenHashB = await hashDeviceToken(tokenB);
    const tokenLookupB = generateTokenLookup(tokenB);
    
    const devB = await deviceRepo.create({
      tenantId: tenantB.id,
      deviceId: deviceIdB,
      tokenHash: tokenHashB,
      tokenLookup: tokenLookupB,
      name: 'Device B',
      labels: null,
      notes: null,
    });

    deviceB = {
      deviceId: devB.deviceId,
      token: tokenB,
      tenantId: tenantB.id,
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

  describe('MQTT Reserved Topics Blocking', () => {
    it('should block subscription to $SYS/ topics', () => {
      return new Promise<void>((resolve, reject) => {
        const client = mqtt.connect(`mqtt://localhost:${port}`, {
          clientId: 'test-client-sys-sub',
          username: deviceA.token,
          clean: true,
          reconnectPeriod: 0,
        });

        client.on('connect', () => {
          client.subscribe('$SYS/broker/info', (err) => {
            if (err) {
              client.end();
              resolve(); // Expected to fail
            } else {
              client.end();
              reject(new Error('Should not be able to subscribe to $SYS/ topic'));
            }
          });
        });

        client.on('error', (err) => {
          client.end();
          reject(new Error(`Connection failed: ${err.message}`));
        });
      });
    });

    it('should block subscription to $share/ topics', () => {
      return new Promise<void>((resolve, reject) => {
        const client = mqtt.connect(`mqtt://localhost:${port}`, {
          clientId: 'test-client-share-sub',
          username: deviceA.token,
          clean: true,
          reconnectPeriod: 0,
        });

        client.on('connect', () => {
          client.subscribe('$share/group/devices/#', (err) => {
            if (err) {
              client.end();
              resolve(); // Expected to fail
            } else {
              client.end();
              reject(new Error('Should not be able to subscribe to $share/ topic'));
            }
          });
        });

        client.on('error', (err) => {
          client.end();
          reject(new Error(`Connection failed: ${err.message}`));
        });
      });
    });

    it('should block subscription to $queue/ topics', () => {
      return new Promise<void>((resolve, reject) => {
        const client = mqtt.connect(`mqtt://localhost:${port}`, {
          clientId: 'test-client-queue-sub',
          username: deviceA.token,
          clean: true,
          reconnectPeriod: 0,
        });

        client.on('connect', () => {
          client.subscribe('$queue/devices/telemetry', (err) => {
            if (err) {
              client.end();
              resolve(); // Expected to fail
            } else {
              client.end();
              reject(new Error('Should not be able to subscribe to $queue/ topic'));
            }
          });
        });

        client.on('error', (err) => {
          client.end();
          reject(new Error(`Connection failed: ${err.message}`));
        });
      });
    });

    it('should block publish to $SYS/ topics', () => {
      return new Promise<void>((resolve, reject) => {
        const subscriberClient = mqtt.connect(`mqtt://localhost:${port}`, {
          clientId: 'test-client-sys-subscriber',
          username: deviceA.token,
          clean: true,
          reconnectPeriod: 0,
        });

        const publisherClient = mqtt.connect(`mqtt://localhost:${port}`, {
          clientId: 'test-client-sys-pub',
          username: deviceB.token,
          clean: true,
          reconnectPeriod: 0,
        });

        let messageReceived = false;

        subscriberClient.on('connect', () => {
          // Try to subscribe to $SYS/ topic (this should fail)
          subscriberClient.subscribe('#', () => {
            // Subscription to # should work (but within tenant namespace)
            // Now publisher will try to publish to $SYS/
          });
        });

        publisherClient.on('connect', () => {
          setTimeout(() => {
            // Try to publish to $SYS/ - this should be rejected by broker
            publisherClient.publish('$SYS/broker/custom', 'malicious');
            
            // Give time for message to potentially arrive
            setTimeout(() => {
              subscriberClient.end();
              publisherClient.end();
              
              // The message should NOT have been received because publish was blocked
              if (messageReceived) {
                reject(new Error('Message to $SYS/ topic should have been blocked'));
              } else {
                resolve();
              }
            }, 200);
          }, 100);
        });

        subscriberClient.on('message', (topic) => {
          // Should not receive any $SYS/ messages
          if (topic.includes('$SYS')) {
            messageReceived = true;
          }
        });

        subscriberClient.on('error', (err) => {
          subscriberClient.end();
          publisherClient.end();
          reject(new Error(`Subscriber connection error: ${err.message}`));
        });

        publisherClient.on('error', (err) => {
          subscriberClient.end();
          publisherClient.end();
          reject(new Error(`Publisher connection error: ${err.message}`));
        });
      });
    });
  });

  describe('Tenant Isolation', () => {
    it('should allow device from tenant A to publish and subscribe within its namespace', () => {
      return new Promise<void>((resolve, reject) => {
        const client = mqtt.connect(`mqtt://localhost:${port}`, {
          clientId: 'test-client-tenant-a-pubsub',
          username: deviceA.token,
          clean: true,
          reconnectPeriod: 0,
        });

        client.on('connect', () => {
          // Subscribe to a topic
          client.subscribe('devices/foo/telemetry', (err) => {
            if (err) {
              client.end();
              reject(new Error(`Subscription failed: ${err.message}`));
              return;
            }

            // Publish to the same topic
            client.publish('devices/foo/telemetry', JSON.stringify({ value: 42 }), (err) => {
              if (err) {
                client.end();
                reject(new Error(`Publish failed: ${err.message}`));
              }
            });
          });
        });

        client.on('message', (topic, payload) => {
          // Should receive message on the tenant-prefixed topic
          expect(topic).toBe('tenants/' + deviceA.tenantId + '/devices/foo/telemetry');
          expect(JSON.parse(payload.toString())).toEqual({ value: 42 });
          client.end();
          resolve();
        });

        client.on('error', (err) => {
          client.end();
          reject(new Error(`Connection error: ${err.message}`));
        });
      });
    });

    it('should prevent cross-tenant subscription', () => {
      return new Promise<void>((resolve, reject) => {
        // Device from tenant A subscribes to all topics
        const clientA = mqtt.connect(`mqtt://localhost:${port}`, {
          clientId: 'test-client-cross-tenant-sub',
          username: deviceA.token,
          clean: true,
          reconnectPeriod: 0,
        });

        // Device from tenant B publishes a message
        const clientB = mqtt.connect(`mqtt://localhost:${port}`, {
          clientId: 'test-client-tenant-b-pub2',
          username: deviceB.token,
          clean: true,
          reconnectPeriod: 0,
        });

        let messageReceivedByA = false;
        let clientAReady = false;
        let clientBReady = false;

        const checkBothReady = () => {
          if (clientAReady && clientBReady) {
            // Both clients ready, now publish from B
            setTimeout(() => {
              clientB.publish('devices/secret', JSON.stringify({ secret: 'data' }));
              
              // Wait to see if clientA receives the message
              setTimeout(() => {
                clientA.end();
                clientB.end();
                if (messageReceivedByA) {
                  reject(new Error('Client A should not receive messages from tenant B'));
                } else {
                  resolve(); // Expected: no cross-tenant access
                }
              }, 300);
            }, 100);
          }
        };

        clientA.on('connect', () => {
          // Subscribe to all topics (but will be scoped to tenant A)
          clientA.subscribe('#', (err) => {
            if (err) {
              clientA.end();
              clientB.end();
              reject(new Error(`Client A subscription failed: ${err.message}`));
              return;
            }
            clientAReady = true;
            checkBothReady();
          });
        });

        clientB.on('connect', () => {
          clientBReady = true;
          checkBothReady();
        });

        clientA.on('message', (_topic, payload) => {
          // Client A should NOT receive messages from tenant B
          // Messages from B would be on tenants/B/... which A cannot access
          const data = JSON.parse(payload.toString());
          if (data.secret === 'data') {
            messageReceivedByA = true;
          }
        });

        clientA.on('error', (err) => {
          clientA.end();
          clientB.end();
          reject(new Error(`Client A error: ${err.message}`));
        });

        clientB.on('error', (err) => {
          clientA.end();
          clientB.end();
          reject(new Error(`Client B error: ${err.message}`));
        });
      });
    });

    it('should isolate tenants even with double-prefix attempts', () => {
      return new Promise<void>((resolve, reject) => {
        // Device from tenant A tries to publish to tenants/B/... topic
        const clientA = mqtt.connect(`mqtt://localhost:${port}`, {
          clientId: 'test-client-double-prefix',
          username: deviceA.token,
          clean: true,
          reconnectPeriod: 0,
        });

        clientA.on('connect', () => {
          // Subscribe to see what topic the message actually goes to
          clientA.subscribe('#', (err) => {
            if (err) {
              clientA.end();
              reject(new Error(`Subscription failed: ${err.message}`));
              return;
            }

            // Try to publish to tenant B's namespace
            clientA.publish(`tenants/${deviceB.tenantId}/devices/steal`, 
              JSON.stringify({ attempt: 'malicious' }));
          });
        });

        clientA.on('message', (topic) => {
          // The topic should be rewritten to tenants/A/tenants/B/devices/steal
          // which is isolated within tenant A's namespace
          const expectedTopic = `tenants/${deviceA.tenantId}/tenants/${deviceB.tenantId}/devices/steal`;
          expect(topic).toBe(expectedTopic);
          
          // Verify it's within tenant A's namespace
          expect(topic).toContain(`tenants/${deviceA.tenantId}/`);
          
          clientA.end();
          resolve();
        });

        clientA.on('error', (err) => {
          clientA.end();
          reject(new Error(`Connection error: ${err.message}`));
        });
      });
    });
  });

  describe('Wildcard Subscriptions', () => {
    it('should support wildcard subscriptions within tenant namespace', () => {
      return new Promise<void>((resolve, reject) => {
        const client = mqtt.connect(`mqtt://localhost:${port}`, {
          clientId: 'test-client-wildcard',
          username: deviceA.token,
          clean: true,
          reconnectPeriod: 0,
        });

        let messagesReceived = 0;
        const expectedMessages = 2;

        client.on('connect', () => {
          // Subscribe with single-level wildcard
          client.subscribe('devices/+/telemetry', (err) => {
            if (err) {
              client.end();
              reject(new Error(`Subscription failed: ${err.message}`));
              return;
            }

            // Publish to multiple topics that match the wildcard
            client.publish('devices/device1/telemetry', JSON.stringify({ id: 1 }));
            client.publish('devices/device2/telemetry', JSON.stringify({ id: 2 }));
          });
        });

        client.on('message', (topic) => {
          messagesReceived++;
          
          // Verify topic is within tenant's namespace
          expect(topic).toContain(`tenants/${deviceA.tenantId}/devices/`);
          expect(topic).toMatch(/\/telemetry$/);
          
          if (messagesReceived === expectedMessages) {
            client.end();
            resolve();
          }
        });

        client.on('error', (err) => {
          client.end();
          reject(new Error(`Connection error: ${err.message}`));
        });

        // Safety timeout
        setTimeout(() => {
          if (messagesReceived < expectedMessages) {
            client.end();
            reject(new Error(`Expected ${expectedMessages} messages but received ${messagesReceived}`));
          }
        }, 1000);
      });
    });

    it('should support multi-level wildcard subscriptions within tenant namespace', () => {
      return new Promise<void>((resolve, reject) => {
        const client = mqtt.connect(`mqtt://localhost:${port}`, {
          clientId: 'test-client-multilevel-wildcard',
          username: deviceA.token,
          clean: true,
          reconnectPeriod: 0,
        });

        let messagesReceived = 0;
        const expectedMessages = 3;

        client.on('connect', () => {
          // Subscribe with multi-level wildcard
          client.subscribe('devices/#', (err) => {
            if (err) {
              client.end();
              reject(new Error(`Subscription failed: ${err.message}`));
              return;
            }

            // Publish to various topics under devices/
            client.publish('devices/foo/telemetry', JSON.stringify({ type: 'telemetry' }));
            client.publish('devices/bar/status', JSON.stringify({ type: 'status' }));
            client.publish('devices/baz/config/update', JSON.stringify({ type: 'config' }));
          });
        });

        client.on('message', (topic) => {
          messagesReceived++;
          
          // Verify all topics are within tenant's namespace
          expect(topic).toContain(`tenants/${deviceA.tenantId}/devices/`);
          
          if (messagesReceived === expectedMessages) {
            client.end();
            resolve();
          }
        });

        client.on('error', (err) => {
          client.end();
          reject(new Error(`Connection error: ${err.message}`));
        });

        // Safety timeout
        setTimeout(() => {
          if (messagesReceived < expectedMessages) {
            client.end();
            reject(new Error(`Expected ${expectedMessages} messages but received ${messagesReceived}`));
          }
        }, 1000);
      });
    });
  });
});
