import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PocketMQTT } from '../index.js';
import { getDbClient } from '../database.js';
import { deviceToken as deviceTokenSchema } from '../db/schema.js';

describe('Device API Routes', () => {
  let app: PocketMQTT;
  let db: ReturnType<typeof getDbClient>;
  let jwtToken: string;
  const MQTT_PORT = 1891;
  const API_PORT = 3011;
  const API_HOST = '127.0.0.1';

  beforeAll(async () => {
    db = getDbClient();
    
    // Clean up any existing data
    await db.delete(deviceTokenSchema);
    
    // Initialize PocketMQTT
    app = new PocketMQTT({
      mqttPort: MQTT_PORT,
      apiPort: API_PORT,
      apiHost: API_HOST
    });
    await app.start();

    // Get JWT token for authenticated requests
    const loginResponse = await fetch(`http://${API_HOST}:${API_PORT}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    });
    
    const loginData = await loginResponse.json();
    jwtToken = loginData.token;
  });

  beforeEach(async () => {
    // Clean database before each test for isolation
    await db.delete(deviceTokenSchema);
  });

  afterAll(async () => {
    await db.delete(deviceTokenSchema);
    await app.stop();
  }, 15000);

  describe('POST /api/devices - Create Device', () => {
    it('should create a new device with auto-generated token', async () => {
      // Given: Device data
      const deviceData = {
        nombre: 'Temperature Sensor 1',
        labels: ['sensor', 'temperature', 'zone-1'],
        comentario: 'Located in the main warehouse'
      };

      // When: Creating a device
      const response = await fetch(`http://${API_HOST}:${API_PORT}/api/devices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwtToken}`
        },
        body: JSON.stringify(deviceData)
      });

      // Then: Device should be created with generated token
      expect(response.status).toBe(201);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.device).toBeDefined();
      expect(data.device.id).toBeDefined();
      expect(data.device.deviceId).toBeDefined();
      expect(data.device.token).toBeDefined();
      expect(data.device.token).toMatch(/^[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}$/);
      expect(data.device.nombre).toBe(deviceData.nombre);
      expect(data.device.labels).toEqual(deviceData.labels);
      expect(data.device.comentario).toBe(deviceData.comentario);
      expect(data.device.createdAt).toBeDefined();
    });

    it('should create a device with only required fields (nombre)', async () => {
      // Given: Minimal device data
      const deviceData = {
        nombre: 'Simple Device'
      };

      // When: Creating a device
      const response = await fetch(`http://${API_HOST}:${API_PORT}/api/devices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwtToken}`
        },
        body: JSON.stringify(deviceData)
      });

      // Then: Device should be created
      expect(response.status).toBe(201);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.device.nombre).toBe(deviceData.nombre);
      expect(data.device.labels).toBeNull();
      expect(data.device.comentario).toBeNull();
    });

    it('should reject creation without nombre', async () => {
      // Given: Device data without nombre
      const deviceData = {
        labels: ['test']
      };

      // When: Creating a device
      const response = await fetch(`http://${API_HOST}:${API_PORT}/api/devices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwtToken}`
        },
        body: JSON.stringify(deviceData)
      });

      // Then: Should return 400 error
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('nombre');
    });

    it('should reject creation with invalid labels (not an array)', async () => {
      // Given: Device data with invalid labels
      const deviceData = {
        nombre: 'Test Device',
        labels: 'not-an-array'
      };

      // When: Creating a device
      const response = await fetch(`http://${API_HOST}:${API_PORT}/api/devices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwtToken}`
        },
        body: JSON.stringify(deviceData)
      });

      // Then: Should return 400 error
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('labels');
    });

    it('should require authentication', async () => {
      // Given: Device data
      const deviceData = { nombre: 'Test' };

      // When: Creating without token
      const response = await fetch(`http://${API_HOST}:${API_PORT}/api/devices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deviceData)
      });

      // Then: Should return 401
      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/devices - List Devices', () => {
    it('should list all devices', async () => {
      // Given: Multiple devices created
      await fetch(`http://${API_HOST}:${API_PORT}/api/devices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwtToken}`
        },
        body: JSON.stringify({ nombre: 'Device 1', labels: ['test'] })
      });

      await fetch(`http://${API_HOST}:${API_PORT}/api/devices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwtToken}`
        },
        body: JSON.stringify({ nombre: 'Device 2' })
      });

      // When: Listing devices
      const response = await fetch(`http://${API_HOST}:${API_PORT}/api/devices`, {
        headers: { 'Authorization': `Bearer ${jwtToken}` }
      });

      // Then: Should return all devices
      expect(response.ok).toBe(true);
      const data = await response.json();
      
      expect(data.data).toBeDefined();
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBe(2);
      expect(data.pagination).toBeDefined();
      expect(data.pagination.total).toBe(2);
    });

    it('should support pagination', async () => {
      // Given: Multiple devices
      for (let i = 0; i < 5; i++) {
        await fetch(`http://${API_HOST}:${API_PORT}/api/devices`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${jwtToken}`
          },
          body: JSON.stringify({ nombre: `Device ${i}` })
        });
      }

      // When: Getting first page
      const response1 = await fetch(`http://${API_HOST}:${API_PORT}/api/devices?limit=2&offset=0`, {
        headers: { 'Authorization': `Bearer ${jwtToken}` }
      });
      const data1 = await response1.json();

      // Then: Should return 2 devices
      expect(data1.data.length).toBe(2);
      expect(data1.pagination.limit).toBe(2);
      expect(data1.pagination.offset).toBe(0);

      // When: Getting second page
      const response2 = await fetch(`http://${API_HOST}:${API_PORT}/api/devices?limit=2&offset=2`, {
        headers: { 'Authorization': `Bearer ${jwtToken}` }
      });
      const data2 = await response2.json();

      // Then: Should return 2 more devices
      expect(data2.data.length).toBe(2);
      expect(data2.pagination.offset).toBe(2);
    });

    it('should require authentication', async () => {
      const response = await fetch(`http://${API_HOST}:${API_PORT}/api/devices`);
      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/devices/:id - Get Device', () => {
    it('should get a specific device by id', async () => {
      // Given: A created device
      const createResponse = await fetch(`http://${API_HOST}:${API_PORT}/api/devices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwtToken}`
        },
        body: JSON.stringify({ nombre: 'Test Device', labels: ['test'] })
      });
      const createData = await createResponse.json();
      const deviceId = createData.device.id;

      // When: Getting the device
      const response = await fetch(`http://${API_HOST}:${API_PORT}/api/devices/${deviceId}`, {
        headers: { 'Authorization': `Bearer ${jwtToken}` }
      });

      // Then: Should return the device
      expect(response.ok).toBe(true);
      const data = await response.json();
      
      expect(data.device).toBeDefined();
      expect(data.device.id).toBe(deviceId);
      expect(data.device.nombre).toBe('Test Device');
      expect(data.device.labels).toEqual(['test']);
    });

    it('should return 404 for non-existent device', async () => {
      const response = await fetch(`http://${API_HOST}:${API_PORT}/api/devices/99999`, {
        headers: { 'Authorization': `Bearer ${jwtToken}` }
      });

      expect(response.status).toBe(404);
    });

    it('should require authentication', async () => {
      const response = await fetch(`http://${API_HOST}:${API_PORT}/api/devices/1`);
      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/devices/:id/regenerate-token - Regenerate Token', () => {
    it('should regenerate device token', async () => {
      // Given: A created device
      const createResponse = await fetch(`http://${API_HOST}:${API_PORT}/api/devices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwtToken}`
        },
        body: JSON.stringify({ nombre: 'Test Device' })
      });
      const createData = await createResponse.json();
      const deviceId = createData.device.id;
      const originalToken = createData.device.token;

      // When: Regenerating token
      const response = await fetch(`http://${API_HOST}:${API_PORT}/api/devices/${deviceId}/regenerate-token`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${jwtToken}` }
      });

      // Then: Should return new token
      expect(response.ok).toBe(true);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.device.token).toBeDefined();
      expect(data.device.token).not.toBe(originalToken);
      expect(data.device.token).toMatch(/^[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}$/);
    });

    it('should return 404 for non-existent device', async () => {
      const response = await fetch(`http://${API_HOST}:${API_PORT}/api/devices/99999/regenerate-token`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${jwtToken}` }
      });

      expect(response.status).toBe(404);
    });

    it('should require authentication', async () => {
      const response = await fetch(`http://${API_HOST}:${API_PORT}/api/devices/1/regenerate-token`, {
        method: 'POST'
      });
      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/devices/:id - Update Device', () => {
    it('should update device metadata', async () => {
      // Given: A created device
      const createResponse = await fetch(`http://${API_HOST}:${API_PORT}/api/devices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwtToken}`
        },
        body: JSON.stringify({ nombre: 'Original Name' })
      });
      const createData = await createResponse.json();
      const deviceId = createData.device.id;

      // When: Updating the device
      const response = await fetch(`http://${API_HOST}:${API_PORT}/api/devices/${deviceId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwtToken}`
        },
        body: JSON.stringify({
          nombre: 'Updated Name',
          labels: ['updated', 'test'],
          comentario: 'Updated comment'
        })
      });

      // Then: Should return updated device
      expect(response.ok).toBe(true);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.device.nombre).toBe('Updated Name');
      expect(data.device.labels).toEqual(['updated', 'test']);
      expect(data.device.comentario).toBe('Updated comment');
    });

    it('should allow partial updates', async () => {
      // Given: A created device
      const createResponse = await fetch(`http://${API_HOST}:${API_PORT}/api/devices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwtToken}`
        },
        body: JSON.stringify({ nombre: 'Original', labels: ['test'] })
      });
      const createData = await createResponse.json();
      const deviceId = createData.device.id;

      // When: Updating only nombre
      const response = await fetch(`http://${API_HOST}:${API_PORT}/api/devices/${deviceId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwtToken}`
        },
        body: JSON.stringify({ nombre: 'Only Name Changed' })
      });

      // Then: Should update only nombre
      expect(response.ok).toBe(true);
      const data = await response.json();
      
      expect(data.device.nombre).toBe('Only Name Changed');
      expect(data.device.labels).toEqual(['test']); // Should remain unchanged
    });

    it('should return 404 for non-existent device', async () => {
      const response = await fetch(`http://${API_HOST}:${API_PORT}/api/devices/99999`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwtToken}`
        },
        body: JSON.stringify({ nombre: 'Test' })
      });

      expect(response.status).toBe(404);
    });

    it('should require authentication', async () => {
      const response = await fetch(`http://${API_HOST}:${API_PORT}/api/devices/1`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: 'Test' })
      });
      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/devices/:id - Delete Device', () => {
    it('should delete a device', async () => {
      // Given: A created device
      const createResponse = await fetch(`http://${API_HOST}:${API_PORT}/api/devices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwtToken}`
        },
        body: JSON.stringify({ nombre: 'To Be Deleted' })
      });
      const createData = await createResponse.json();
      const deviceId = createData.device.id;

      // When: Deleting the device
      const response = await fetch(`http://${API_HOST}:${API_PORT}/api/devices/${deviceId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${jwtToken}` }
      });

      // Then: Should succeed
      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.success).toBe(true);

      // And: Device should no longer exist
      const getResponse = await fetch(`http://${API_HOST}:${API_PORT}/api/devices/${deviceId}`, {
        headers: { 'Authorization': `Bearer ${jwtToken}` }
      });
      expect(getResponse.status).toBe(404);
    });

    it('should return 404 for non-existent device', async () => {
      const response = await fetch(`http://${API_HOST}:${API_PORT}/api/devices/99999`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${jwtToken}` }
      });

      expect(response.status).toBe(404);
    });

    it('should require authentication', async () => {
      const response = await fetch(`http://${API_HOST}:${API_PORT}/api/devices/1`, {
        method: 'DELETE'
      });
      expect(response.status).toBe(401);
    });
  });
});
