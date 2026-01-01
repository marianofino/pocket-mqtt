import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PocketMQTT } from '../index.js';
import { getDbClient } from '../core/database.js';
import { deviceToken as deviceTokenSchema, tenant as tenantSchema, telemetry as telemetrySchema, user as userSchema } from '../core/db/schema.js';

describe('Admin Dashboard Routes', () => {
  let app: PocketMQTT;
  let db: any;
  let defaultTenantId: number;
  const MQTT_PORT = 1891;
  const API_PORT = 3011;
  const API_HOST = '127.0.0.1';
  
  beforeAll(async () => {
    db = getDbClient();
    
    // Clean up and create test data
    await db.delete(telemetrySchema);
    await db.delete(deviceTokenSchema);
    await db.delete(userSchema);
    await db.delete(tenantSchema);
    
    // Create a default tenant
    const tenantResult = await db.insert(tenantSchema).values({
      name: 'default-tenant',
      apiKey: 'default-api-key-for-testing',
    }).returning();
    defaultTenantId = tenantResult[0].id;
    
    // Initialize PocketMQTT
    app = new PocketMQTT({
      mqttPort: MQTT_PORT,
      apiPort: API_PORT,
      apiHost: API_HOST
    });
    await app.start();
  });

  afterAll(async () => {
    await app.stop();

    // Clean up test data
    db = getDbClient();
    await db.delete(telemetrySchema);
    await db.delete(deviceTokenSchema);
    await db.delete(userSchema);
    await db.delete(tenantSchema);
  });

  describe('Admin Login Page', () => {
    it('should serve login page at /admin/login', async () => {
      const response = await fetch(`http://${API_HOST}:${API_PORT}/admin/login`);
      expect(response.ok).toBe(true);
      expect(response.headers.get('content-type')).toContain('text/html');
      
      const html = await response.text();
      // SPA serves the index.html which contains the root div and main.js
      expect(html).toContain('PocketMQTT Admin');
      expect(html).toContain('id="root"');
    });
  });

  describe('Admin Homepage', () => {
    it('should serve homepage at /admin/', async () => {
      const response = await fetch(`http://${API_HOST}:${API_PORT}/admin/`);
      expect(response.ok).toBe(true);
      expect(response.headers.get('content-type')).toContain('text/html');
      
      const html = await response.text();
      expect(html).toContain('PocketMQTT Admin');
      expect(html).toContain('id="root"');
    });

    it('should serve SPA fallback for nested routes', async () => {
      const response = await fetch(`http://${API_HOST}:${API_PORT}/admin/some-nested-route`);
      expect(response.ok).toBe(true);
      expect(response.headers.get('content-type')).toContain('text/html');
      
      const html = await response.text();
      expect(html).toContain('PocketMQTT Admin');
      expect(html).toContain('id="root"');
    });
  });

  describe('Admin Login API', () => {
    it('should authenticate admin with correct credentials via /api/admin/login', async () => {
      const response = await fetch(`http://${API_HOST}:${API_PORT}/api/admin/login`, {
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
      expect(data.token.length).toBeGreaterThan(0);
    });

    it('should reject invalid credentials via /api/admin/login', async () => {
      const response = await fetch(`http://${API_HOST}:${API_PORT}/api/admin/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: 'admin',
          password: 'wrongpassword'
        })
      });
      
      expect(response.status).toBe(401);
      
      const data = await response.json();
      expect(data).toHaveProperty('error');
    });

    it('should reject missing username', async () => {
      const response = await fetch(`http://${API_HOST}:${API_PORT}/api/admin/login`, {
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
      expect(data).toHaveProperty('error');
      expect(data.error).toContain('Username');
    });

    it('should reject missing password', async () => {
      const response = await fetch(`http://${API_HOST}:${API_PORT}/api/admin/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: 'admin'
        })
      });
      
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data).toHaveProperty('error');
      expect(data.error).toContain('Password');
    });

    it('should use custom admin credentials from environment variables', async () => {
      // This test verifies the behavior is consistent with env var configuration
      // The actual env vars are tested in integration scenarios
      const adminUser = process.env.ADMIN_USERNAME || 'admin';
      const adminPass = process.env.ADMIN_PASSWORD || 'admin123';
      
      const response = await fetch(`http://${API_HOST}:${API_PORT}/api/admin/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: adminUser,
          password: adminPass
        })
      });
      
      expect(response.ok).toBe(true);
      
      const data = await response.json();
      expect(data).toHaveProperty('token');
    });
  });
});
