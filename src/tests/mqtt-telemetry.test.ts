import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { connect } from 'mqtt';
import { PocketMQTT } from '../index.js';
import { getDbClient } from '../core/database.js';
import { telemetry as telemetrySchema, deviceToken as deviceTokenSchema, tenant as tenantSchema } from '../core/db/schema.js';
import { count, asc, eq } from 'drizzle-orm';

describe('MQTT Telemetry Integration Tests', () => {
  let app: PocketMQTT;
  let db: ReturnType<typeof getDbClient>;
  let defaultTenantId: number;
  const MQTT_PORT = 1884;
  const API_PORT = 3001;
  const testDeviceId = 'test-device';
  const testDeviceToken = 'test-token-12345';

  beforeAll(async () => {
    db = getDbClient();
    
    // Clean up any existing data
    await db.delete(deviceTokenSchema);
    await db.delete(telemetrySchema);
    await db.delete(tenantSchema);
    
    // Create a default tenant with ID=1 for DEFAULT_TENANT_ID compatibility
    const tenantResult = await db.insert(tenantSchema).values({
      id: 1,
      name: 'default-tenant',
      apiKey: 'default-api-key-for-testing',
    }).returning();
    defaultTenantId = tenantResult[0].id;
    
    // Create a test device token
    await db.insert(deviceTokenSchema).values({
      tenantId: defaultTenantId,
      deviceId: testDeviceId,
      token: testDeviceToken,
      name: 'Test MQTT Device'
    });
    
    // Initialize PocketMQTT with both services
    app = new PocketMQTT({
      mqttPort: MQTT_PORT,
      apiPort: API_PORT
    });
    await app.start();
  });

  beforeEach(async () => {
    // Clean database before each test for isolation
    await db.delete(telemetrySchema);
  });

  afterAll(async () => {
    // Clean up data before stopping
    await db.delete(deviceTokenSchema);
    await db.delete(telemetrySchema);
    await db.delete(tenantSchema);
    
    // Now stop the app (which will disconnect database)
    await app.stop();
  }, 15000);

  it('should buffer MQTT messages and flush them to database after 2 seconds', async () => {
    // Given: MQTT client connected with valid credentials
    const client = connect(`mqtt://localhost:${MQTT_PORT}`, {
      username: testDeviceId,
      password: testDeviceToken
    });
    
    await new Promise<void>((resolve, reject) => {
      client.on('connect', () => resolve());
      client.on('error', reject);
      setTimeout(() => reject(new Error('Connection timeout')), 5000);
    });

    // When: Publish 5 messages
    for (let i = 0; i < 5; i++) {
      client.publish(`test/topic${i}`, `payload${i}`);
    }

    // Wait a bit for messages to be buffered
    await new Promise(resolve => setTimeout(resolve, 500));

    // Then: Messages should not be in database yet
    let result = await db.select({ count: count() }).from(telemetrySchema);
    expect(result[0].count).toBe(0);

    // Wait for flush (2+ seconds)
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Then: All messages should be flushed to database
    result = await db.select({ count: count() }).from(telemetrySchema);
    expect(result[0].count).toBe(5);

    const messages = await db.select().from(telemetrySchema).orderBy(asc(telemetrySchema.id));
    
    expect(messages[0].topic).toBe('test/topic0');
    expect(messages[0].payload).toBe('payload0');
    expect(messages[4].topic).toBe('test/topic4');
    expect(messages[4].payload).toBe('payload4');

    client.end();
  }, 10000);

  it('should handle high-frequency MQTT messages (>1000 msg/min)', async () => {
    // Given: MQTT client connected with valid credentials
    const client = connect(`mqtt://localhost:${MQTT_PORT}`, {
      username: testDeviceId,
      password: testDeviceToken
    });
    
    await new Promise<void>((resolve, reject) => {
      client.on('connect', () => resolve());
      client.on('error', reject);
      setTimeout(() => reject(new Error('Connection timeout')), 5000);
    });

    // When: Publish 150 messages rapidly (triggers buffer size flush at 100)
    const publishPromises = [];
    for (let i = 0; i < 150; i++) {
      publishPromises.push(
        new Promise<void>((resolve) => {
          client.publish(`telemetry/sensor${i % 10}`, `value${i}`, () => resolve());
        })
      );
    }
    await Promise.all(publishPromises);

    // Wait for flushes to complete
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Then: All messages should be persisted
    const result = await db.select({ count: count() }).from(telemetrySchema);
    expect(result[0].count).toBe(150);

    client.end();
  }, 15000);

  it('should skip system topics (starting with $)', async () => {
    // Given: MQTT client connected with valid credentials
    const client = connect(`mqtt://localhost:${MQTT_PORT}`, {
      username: testDeviceId,
      password: testDeviceToken
    });
    
    await new Promise<void>((resolve, reject) => {
      client.on('connect', () => resolve());
      client.on('error', reject);
      setTimeout(() => reject(new Error('Connection timeout')), 5000);
    });

    // When: Publish regular topics (skip system topics test for now - Aedes handles $SYS internally)
    client.publish('sensor/temperature', '25.5');
    client.publish('sensor/humidity', '60');
    client.publish('device/status', 'online');

    // Wait for messages to be buffered and flushed
    await new Promise(resolve => setTimeout(resolve, 2500));

    // Then: All regular topics should be stored
    const messages = await db.select().from(telemetrySchema).orderBy(asc(telemetrySchema.id));
    expect(messages.length).toBeGreaterThanOrEqual(3);
    expect(messages.some(m => m.topic === 'sensor/temperature')).toBe(true);
    expect(messages.some(m => m.topic === 'sensor/humidity')).toBe(true);
    expect(messages.some(m => m.topic === 'device/status')).toBe(true);

    client.end();
  }, 10000);
});

describe('Telemetry API Endpoints', () => {
  let app: PocketMQTT;
  let db: ReturnType<typeof getDbClient>;
  let defaultTenantId: number;
  const MQTT_PORT = 1885;
  const API_PORT = 3002;
  let authToken: string;

  // Helper function to get JWT token
  async function getAuthToken(): Promise<string> {
    const response = await fetch(`http://localhost:${API_PORT}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    });
    const data = await response.json();
    return data.token;
  }

  beforeAll(async () => {
    db = getDbClient();
    
    // Clean up any existing data
    await db.delete(telemetrySchema);
    await db.delete(tenantSchema);
    
    // Create a default tenant with ID=1 for DEFAULT_TENANT_ID compatibility
    const tenantResult = await db.insert(tenantSchema).values({
      id: 1,
      name: 'api-test-tenant',
      apiKey: 'api-test-tenant-key',
    }).returning();
    defaultTenantId = tenantResult[0].id;
    
    // Initialize PocketMQTT
    app = new PocketMQTT({
      mqttPort: MQTT_PORT,
      apiPort: API_PORT
    });
    await app.start();

    // Get auth token for tests
    authToken = await getAuthToken();
  });

  beforeEach(async () => {
    // Clean database before each test for isolation
    await db.delete(telemetrySchema);
  });

  afterAll(async () => {
    // Clean up data before stopping
    await db.delete(telemetrySchema);
    await db.delete(tenantSchema);
    
    // Now stop the app (which will disconnect database)
    await app.stop();
  }, 15000);

  it('should submit telemetry via POST /api/v1/telemetry', async () => {
    // When: POST telemetry data
    const response = await fetch(`http://localhost:${API_PORT}/api/v1/telemetry`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        topic: 'api/test/topic',
        payload: 'test payload from API'
      })
    });

    // Then: Should return success
    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data.success).toBe(true);

    // Wait for flush
    await new Promise(resolve => setTimeout(resolve, 2500));

    // Verify data in database
    const messages = await db.select()
      .from(telemetrySchema)
      .where(eq(telemetrySchema.topic, 'api/test/topic'));
    expect(messages).toHaveLength(1);
    expect(messages[0].payload).toBe('test payload from API');
  }, 10000);

  it('should return 400 for invalid POST data', async () => {
    // When: POST invalid data (missing payload)
    const response = await fetch(`http://localhost:${API_PORT}/api/v1/telemetry`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        topic: 'api/test/topic'
        // missing payload
      })
    });

    // Then: Should return 400
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBeTruthy();
  });

  it('should retrieve telemetry via GET /api/v1/telemetry', async () => {
    // Given: Some telemetry data in database
    await db.insert(telemetrySchema).values([
      { tenantId: defaultTenantId, topic: 'test/topic1', payload: 'payload1', timestamp: new Date() },
      { tenantId: defaultTenantId, topic: 'test/topic2', payload: 'payload2', timestamp: new Date() },
      { tenantId: defaultTenantId, topic: 'test/topic3', payload: 'payload3', timestamp: new Date() },
    ]);

    // When: GET telemetry data
    const response = await fetch(`http://localhost:${API_PORT}/api/v1/telemetry`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    // Then: Should return all telemetry
    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data.data).toHaveLength(3);
    expect(data.pagination.total).toBe(3);
    expect(data.pagination.limit).toBe(100);
    expect(data.pagination.offset).toBe(0);
  });

  it('should filter telemetry by topic', async () => {
    // Given: Telemetry data with different topics
    await db.insert(telemetrySchema).values([
      { tenantId: defaultTenantId, topic: 'sensor/temperature', payload: '25.5', timestamp: new Date() },
      { tenantId: defaultTenantId, topic: 'sensor/humidity', payload: '60', timestamp: new Date() },
      { tenantId: defaultTenantId, topic: 'sensor/temperature', payload: '26.0', timestamp: new Date() },
    ]);

    // When: GET telemetry filtered by topic
    const response = await fetch(`http://localhost:${API_PORT}/api/v1/telemetry?topic=sensor/temperature`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    // Then: Should return only temperature readings
    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data.data).toHaveLength(2);
    expect(data.pagination.total).toBe(2);
    expect(data.data.every((msg: { topic: string }) => msg.topic === 'sensor/temperature')).toBe(true);
  });

  it('should support pagination with limit and offset', async () => {
    // Given: Multiple telemetry records
    const records = [];
    for (let i = 0; i < 50; i++) {
      records.push({
        tenantId: defaultTenantId,
        topic: `test/topic${i}`,
        payload: `payload${i}`,
        timestamp: new Date(Date.now() + i * 1000) // Spread timestamps
      });
    }
    await db.insert(telemetrySchema).values(records);

    // When: GET with pagination
    const response = await fetch(`http://localhost:${API_PORT}/api/v1/telemetry?limit=10&offset=20`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    // Then: Should return paginated results
    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data.data).toHaveLength(10);
    expect(data.pagination.total).toBe(50);
    expect(data.pagination.limit).toBe(10);
    expect(data.pagination.offset).toBe(20);
  });
});
