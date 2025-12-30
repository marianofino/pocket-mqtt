import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PocketMQTT } from '../index.js';
import { getDbClient } from '../core/database.js';
import { tenant as tenantSchema, user as userSchema } from '../core/db/schema.js';
import { hashTenantName } from '../core/utils/tenant-utils.js';

describe('Tenant API Routes', () => {
  let app: PocketMQTT;
  let db: ReturnType<typeof getDbClient>;
  const MQTT_PORT = 1892;
  const API_PORT = 3012;
  const API_HOST = '127.0.0.1';

  beforeAll(async () => {
    db = getDbClient();
    
    // Clean up any existing data
    await db.delete(userSchema);
    await db.delete(tenantSchema);
    
    // Initialize PocketMQTT
    app = new PocketMQTT({
      mqttPort: MQTT_PORT,
      apiPort: API_PORT,
      apiHost: API_HOST
    });
    await app.start();
  });

  beforeEach(async () => {
    // Clean database before each test for isolation
    await db.delete(userSchema);
    await db.delete(tenantSchema);
  });

  afterAll(async () => {
    await db.delete(userSchema);
    await db.delete(tenantSchema);
    await app.stop();
  }, 15000);

  describe('POST /api/v1/tenant', () => {
    it('should create a new tenant with valid token', async () => {
      const tenantName = 'acme-cloud';
      const token = hashTenantName(tenantName);

      const response = await fetch(`http://${API_HOST}:${API_PORT}/api/v1/tenant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: tenantName,
          token
        })
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('name', tenantName);
      expect(data).toHaveProperty('apiKey');
      expect(typeof data.apiKey).toBe('string');
      expect(data.apiKey.length).toBeGreaterThan(0);
    });

    it('should reject tenant creation with invalid token', async () => {
      const tenantName = 'test-tenant';
      const invalidToken = 'invalid-token-hash';

      const response = await fetch(`http://${API_HOST}:${API_PORT}/api/v1/tenant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: tenantName,
          token: invalidToken
        })
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data).toHaveProperty('error', 'Invalid tenant token');
    });

    it('should reject duplicate tenant name', async () => {
      const tenantName = 'duplicate-tenant';
      const token = hashTenantName(tenantName);

      // Create first tenant
      const firstResponse = await fetch(`http://${API_HOST}:${API_PORT}/api/v1/tenant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: tenantName,
          token
        })
      });
      expect(firstResponse.status).toBe(201);

      // Try to create duplicate
      const secondResponse = await fetch(`http://${API_HOST}:${API_PORT}/api/v1/tenant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: tenantName,
          token
        })
      });

      expect(secondResponse.status).toBe(409);
      const data = await secondResponse.json();
      expect(data).toHaveProperty('error');
      expect(data.error).toContain('already exists');
    });

    it('should reject invalid tenant name format (uppercase)', async () => {
      const tenantName = 'Invalid-Name';
      const token = hashTenantName(tenantName.toLowerCase());

      const response = await fetch(`http://${API_HOST}:${API_PORT}/api/v1/tenant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: tenantName,
          token
        })
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toHaveProperty('error');
      expect(data.error).toContain('lowercase');
    });

    it('should reject invalid tenant name format (special characters)', async () => {
      const tenantName = 'test_tenant';
      const token = hashTenantName(tenantName);

      const response = await fetch(`http://${API_HOST}:${API_PORT}/api/v1/tenant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: tenantName,
          token
        })
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toHaveProperty('error');
      expect(data.error).toContain('lowercase');
    });

    it('should reject tenant name starting with hyphen', async () => {
      const tenantName = '-test-tenant';
      const token = hashTenantName(tenantName);

      const response = await fetch(`http://${API_HOST}:${API_PORT}/api/v1/tenant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: tenantName,
          token
        })
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toHaveProperty('error');
    });

    it('should reject tenant name ending with hyphen', async () => {
      const tenantName = 'test-tenant-';
      const token = hashTenantName(tenantName);

      const response = await fetch(`http://${API_HOST}:${API_PORT}/api/v1/tenant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: tenantName,
          token
        })
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toHaveProperty('error');
    });

    it('should reject missing name', async () => {
      const token = 'some-token';

      const response = await fetch(`http://${API_HOST}:${API_PORT}/api/v1/tenant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token
        })
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toHaveProperty('error');
      expect(data.error).toContain('name is required');
    });

    it('should reject missing token', async () => {
      const name = 'test-tenant';

      const response = await fetch(`http://${API_HOST}:${API_PORT}/api/v1/tenant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name
        })
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toHaveProperty('error');
      expect(data.error).toContain('token is required');
    });
  });

  describe('POST /api/v1/tenant/:tenantId/user', () => {
    let tenantId: number;
    let tenantApiKey: string;

    beforeEach(async () => {
      // Create a tenant for user tests
      const tenantName = 'test-tenant';
      const token = hashTenantName(tenantName);

      const tenantResponse = await fetch(`http://${API_HOST}:${API_PORT}/api/v1/tenant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: tenantName,
          token
        })
      });

      const tenantData = await tenantResponse.json();
      tenantId = tenantData.id;
      tenantApiKey = tenantData.apiKey;
    });

    it('should create a user for a tenant with valid API key', async () => {
      const response = await fetch(`http://${API_HOST}:${API_PORT}/api/v1/tenant/${tenantId}/user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tenantApiKey}`
        },
        body: JSON.stringify({
          username: 'admin',
          password: 'securepassword123'
        })
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('user');
      expect(data.user).toHaveProperty('id');
      expect(data.user).toHaveProperty('tenantId', tenantId);
      expect(data.user).toHaveProperty('username', 'admin');
      expect(data.user).toHaveProperty('createdAt');
      expect(data.user).not.toHaveProperty('passwordHash'); // Should not expose password hash
    });

    it('should reject user creation without Authorization header', async () => {
      const response = await fetch(`http://${API_HOST}:${API_PORT}/api/v1/tenant/${tenantId}/user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'admin',
          password: 'securepassword123'
        })
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data).toHaveProperty('error');
      expect(data.error).toContain('Authorization');
    });

    it('should reject user creation with invalid API key', async () => {
      const response = await fetch(`http://${API_HOST}:${API_PORT}/api/v1/tenant/${tenantId}/user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer invalid-api-key-12345'
        },
        body: JSON.stringify({
          username: 'admin',
          password: 'securepassword123'
        })
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data).toHaveProperty('error', 'Invalid API key');
    });

    it('should reject creating users for a different tenant', async () => {
      // Create another tenant
      const otherTenantName = 'other-tenant';
      const otherToken = hashTenantName(otherTenantName);
      const otherTenantResponse = await fetch(`http://${API_HOST}:${API_PORT}/api/v1/tenant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: otherTenantName,
          token: otherToken
        })
      });
      const otherTenantData = await otherTenantResponse.json();
      const otherTenantId = otherTenantData.id;

      // Try to create a user for the other tenant using the first tenant's API key
      const response = await fetch(`http://${API_HOST}:${API_PORT}/api/v1/tenant/${otherTenantId}/user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tenantApiKey}` // Using first tenant's key
        },
        body: JSON.stringify({
          username: 'admin',
          password: 'securepassword123'
        })
      });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data).toHaveProperty('error');
      expect(data.error).toContain('different tenant');
    });

    it('should reject duplicate username for the same tenant', async () => {
      // Create first user
      const firstResponse = await fetch(`http://${API_HOST}:${API_PORT}/api/v1/tenant/${tenantId}/user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tenantApiKey}`
        },
        body: JSON.stringify({
          username: 'admin',
          password: 'securepassword123'
        })
      });
      expect(firstResponse.status).toBe(201);

      // Try to create duplicate
      const secondResponse = await fetch(`http://${API_HOST}:${API_PORT}/api/v1/tenant/${tenantId}/user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tenantApiKey}`
        },
        body: JSON.stringify({
          username: 'admin',
          password: 'anotherpassword'
        })
      });

      expect(secondResponse.status).toBe(409);
      const data = await secondResponse.json();
      expect(data).toHaveProperty('error');
      expect(data.error).toContain('already exists');
    });

    it('should reject missing username', async () => {
      const response = await fetch(`http://${API_HOST}:${API_PORT}/api/v1/tenant/${tenantId}/user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tenantApiKey}`
        },
        body: JSON.stringify({
          password: 'securepassword123'
        })
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toHaveProperty('error');
      expect(data.error).toContain('username is required');
    });

    it('should reject missing password', async () => {
      const response = await fetch(`http://${API_HOST}:${API_PORT}/api/v1/tenant/${tenantId}/user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tenantApiKey}`
        },
        body: JSON.stringify({
          username: 'admin'
        })
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toHaveProperty('error');
      expect(data.error).toContain('password is required');
    });

    it('should reject password shorter than 8 characters', async () => {
      const response = await fetch(`http://${API_HOST}:${API_PORT}/api/v1/tenant/${tenantId}/user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tenantApiKey}`
        },
        body: JSON.stringify({
          username: 'admin',
          password: 'short'
        })
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toHaveProperty('error');
      expect(data.error).toContain('at least 8 characters');
    });

    it('should reject invalid tenantId format', async () => {
      const response = await fetch(`http://${API_HOST}:${API_PORT}/api/v1/tenant/invalid/user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tenantApiKey}`
        },
        body: JSON.stringify({
          username: 'admin',
          password: 'securepassword123'
        })
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toHaveProperty('error');
      expect(data.error).toContain('tenantId must be a positive integer');
    });
  });
});
