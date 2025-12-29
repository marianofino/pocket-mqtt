import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { connect } from 'mqtt';
import { PocketMQTT } from '../index.js';

describe('PocketMQTT Integration Tests', () => {
  let app: PocketMQTT;
  const MQTT_PORT = 1883;
  const API_PORT = 3000;
  const testDeviceId = 'integration-test-device';
  const testDeviceToken = 'integration-test-token';

  beforeAll(async () => {
    const { getDbClient } = await import('../database.js');
    const { deviceToken } = await import('../db/schema.js');
    const db = getDbClient();
    
    // Clean up and create test device token
    await db.delete(deviceToken);
    await db.insert(deviceToken).values({
      deviceId: testDeviceId,
      token: testDeviceToken
    });
    
    // Initialize PocketMQTT with both services
    app = new PocketMQTT({
      mqttPort: MQTT_PORT,
      apiPort: API_PORT
    });
    await app.start();
  });

  afterAll(async () => {
    const { getDbClient } = await import('../database.js');
    const { deviceToken } = await import('../db/schema.js');
    const db = getDbClient();
    await db.delete(deviceToken);
    await app.stop();
  });

  it('should start Aedes MQTT broker on port 1883', async () => {
    // Create an MQTT client to test connection
    const client = connect(`mqtt://localhost:${MQTT_PORT}`, {
      username: testDeviceId,
      password: testDeviceToken
    });
    
    await new Promise<void>((resolve, reject) => {
      client.on('connect', () => {
        expect(client.connected).toBe(true);
        client.end();
        resolve();
      });
      
      client.on('error', (err) => {
        reject(err);
      });

      // Timeout after 5 seconds
      setTimeout(() => reject(new Error('Connection timeout')), 5000);
    });
  });

  it('should start Fastify API on port 3000', async () => {
    // Test API endpoint
    const response = await fetch(`http://localhost:${API_PORT}/health`);
    expect(response.ok).toBe(true);
    
    const data = await response.json();
    expect(data).toHaveProperty('status');
    expect(data.status).toBe('ok');
  });

  it('should have both MQTT broker and API running simultaneously', async () => {
    // Connect MQTT client
    const mqttClient = connect(`mqtt://localhost:${MQTT_PORT}`, {
      username: testDeviceId,
      password: testDeviceToken
    });
    
    const mqttConnected = new Promise<void>((resolve, reject) => {
      mqttClient.on('connect', () => resolve());
      mqttClient.on('error', reject);
      setTimeout(() => reject(new Error('MQTT timeout')), 5000);
    });

    // Check API health
    const apiResponse = fetch(`http://localhost:${API_PORT}/health`);

    // Both should succeed
    await mqttConnected;
    const response = await apiResponse;
    
    expect(mqttClient.connected).toBe(true);
    expect(response.ok).toBe(true);
    
    mqttClient.end();
  });
});
