import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PocketMQTT } from '../index.js';
import { getDbClient } from '../core/database.js';
import { deviceToken as deviceTokenSchema, tenant as tenantSchema } from '../core/db/schema.js';

describe('Route Plugin Integration', () => {
  let app: PocketMQTT;
  let db: ReturnType<typeof getDbClient>;
  let defaultTenantId: number;
  const MQTT_PORT = 1890;
  const API_PORT = 3010;
  const API_HOST = '127.0.0.1';
  const testDeviceId = 'route-test-device';
  const testDeviceToken = 'route-test-token';
  
  beforeAll(async () => {
    db = getDbClient();
    
    // Clean up and create test data
    await db.delete(deviceTokenSchema);
    await db.delete(tenantSchema);
    
    // Create a default tenant
    const tenantResult = await db.insert(tenantSchema).values({
      name: 'default-tenant',
      apiKey: 'default-api-key-for-testing',
    }).returning();
    defaultTenantId = tenantResult[0].id;
    
    // Create test device token
    await db.insert(deviceTokenSchema).values({
      tenantId: defaultTenantId,
      deviceId: testDeviceId,
      token: testDeviceToken,
      name: 'Test Device for Routes'
    });
    
    // Initialize PocketMQTT
    app = new PocketMQTT({
      mqttPort: MQTT_PORT,
      apiPort: API_PORT,
      apiHost: API_HOST
    });
    await app.start();
  });

  afterAll(async () => {
    await db.delete(deviceTokenSchema);
    await db.delete(tenantSchema);
    await app.stop();
  });

  describe('Health Route Plugin', () => {
    it('should register health endpoint at /health', async () => {
      const response = await fetch(`http://${API_HOST}:${API_PORT}/health`);
      expect(response.ok).toBe(true);
      
      const data = await response.json();
      expect(data).toHaveProperty('status');
      expect(data.status).toBe('ok');
    });
  });

  describe('Auth Route Plugin', () => {
    it('should register login endpoint at /api/v1/auth/login', async () => {
      const response = await fetch(`http://${API_HOST}:${API_PORT}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: 'admin',
          password: 'admin123'
        })
      });
      
      expect(response.ok).toBe(true);
      
      const data = await response.json();
      expect(data).toHaveProperty('token');
      expect(typeof data.token).toBe('string');
    });

    it('should return 401 for invalid credentials', async () => {
      const response = await fetch(`http://${API_HOST}:${API_PORT}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: 'invalid',
          password: 'invalid'
        })
      });
      
      expect(response.status).toBe(401);
      
      const data = await response.json();
      expect(data).toHaveProperty('error');
    });

    it('should return 400 for missing username', async () => {
      const response = await fetch(`http://${API_HOST}:${API_PORT}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          password: 'admin123'
        })
      });
      
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.error).toContain('Username is required');
    });
  });

  describe('Telemetry Route Plugin', () => {
    let jwtToken: string;
    
    beforeAll(async () => {
      // Get JWT token for authenticated requests
      const response = await fetch(`http://${API_HOST}:${API_PORT}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: 'admin',
          password: 'admin123'
        })
      });
      
      const data = await response.json();
      jwtToken = data.token;
    });

    it('should register POST endpoint at /api/v1/telemetry', async () => {
      const response = await fetch(`http://${API_HOST}:${API_PORT}/api/v1/telemetry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwtToken}`
        },
        body: JSON.stringify({
          topic: 'test/route-plugin',
          payload: 'test data',
          tenantId: defaultTenantId
        })
      });
      
      expect(response.ok).toBe(true);
      
      const data = await response.json();
      expect(data).toHaveProperty('success');
      expect(data.success).toBe(true);
    });

    it('should register GET endpoint at /api/v1/telemetry', async () => {
      const response = await fetch(`http://${API_HOST}:${API_PORT}/api/v1/telemetry`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${jwtToken}`
        }
      });
      
      expect(response.ok).toBe(true);
      
      const data = await response.json();
      expect(data).toHaveProperty('data');
      expect(data).toHaveProperty('pagination');
      expect(Array.isArray(data.data)).toBe(true);
    });

    it('should require authentication for POST /api/v1/telemetry', async () => {
      const response = await fetch(`http://${API_HOST}:${API_PORT}/api/v1/telemetry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          topic: 'test/topic',
          payload: 'test data'
        })
      });
      
      expect(response.status).toBe(401);
    });

    it('should require authentication for GET /api/v1/telemetry', async () => {
      const response = await fetch(`http://${API_HOST}:${API_PORT}/api/v1/telemetry`, {
        method: 'GET'
      });
      
      expect(response.status).toBe(401);
    });
  });

  describe('Route Plugin Independence', () => {
    it('should have all routes registered and working independently', async () => {
      // Test health endpoint (public)
      const healthResponse = await fetch(`http://${API_HOST}:${API_PORT}/health`);
      expect(healthResponse.ok).toBe(true);
      
      // Test auth endpoint (public)
      const authResponse = await fetch(`http://${API_HOST}:${API_PORT}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'admin123' })
      });
      expect(authResponse.ok).toBe(true);
      
      const { token } = await authResponse.json();
      
      // Test telemetry endpoints (protected)
      const telemetryPostResponse = await fetch(`http://${API_HOST}:${API_PORT}/api/v1/telemetry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ topic: 'test/independence', payload: 'test', tenantId: defaultTenantId })
      });
      expect(telemetryPostResponse.ok).toBe(true);
      
      const telemetryGetResponse = await fetch(`http://${API_HOST}:${API_PORT}/api/v1/telemetry`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      expect(telemetryGetResponse.ok).toBe(true);
    });
  });
});
