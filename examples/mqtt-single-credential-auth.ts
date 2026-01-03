#!/usr/bin/env tsx
/**
 * Single-Credential MQTT Authentication Example
 * 
 * This example demonstrates the new single-credential authentication mode
 * where devices connect using only their token (no separate deviceId).
 * 
 * This simplifies device provisioning - clients only need to store ONE secret.
 * 
 * Usage:
 * 1. First, set up a device: npx tsx examples/setup-device.ts
 * 2. Note the token from the output
 * 3. Run this example: npx tsx examples/mqtt-single-credential-auth.ts
 */

import mqtt from 'mqtt';

// Configuration
const MQTT_HOST = process.env.MQTT_HOST || 'localhost';
const MQTT_PORT = parseInt(process.env.MQTT_PORT || '1883', 10);

// For this example, we'll use a token from the setup-device script
// In production, this would come from your device provisioning system
const DEVICE_TOKEN = process.env.DEVICE_TOKEN || 'my-secure-device-token-123';

console.log('=== Single-Credential MQTT Authentication Example ===\n');
console.log('Connecting to MQTT broker with token-only authentication...');
console.log(`Host: ${MQTT_HOST}:${MQTT_PORT}`);
console.log(`Token: ${DEVICE_TOKEN}\n`);

// Single-credential mode: Use token as username, no password
const client = mqtt.connect(`mqtt://${MQTT_HOST}:${MQTT_PORT}`, {
  clientId: `single-cred-${Date.now()}`,
  username: DEVICE_TOKEN,  // Token as username
  // No password provided
  clean: true,
  reconnectPeriod: 0,
});

client.on('connect', () => {
  console.log('✓ Successfully connected with single-credential authentication!\n');
  console.log('Key Benefits:');
  console.log('  - Simpler device provisioning (one secret instead of two)');
  console.log('  - Reduced configuration errors');
  console.log('  - Easy token rotation without changing device identity\n');
  
  const topic = 'sensors/demo';
  const message = JSON.stringify({
    temperature: 22.5,
    humidity: 60,
    timestamp: new Date().toISOString()
  });
  
  console.log(`Publishing to topic: ${topic}`);
  client.publish(topic, message, (err) => {
    if (err) {
      console.error('✗ Publish failed:', err.message);
    } else {
      console.log('✓ Message published successfully');
      console.log(`  Payload: ${message}\n`);
    }
    client.end();
  });
});

client.on('error', (err) => {
  console.error('✗ Connection error:', err.message);
  console.log('\nTroubleshooting:');
  console.log('  1. Ensure the MQTT broker is running');
  console.log('  2. Verify the token is valid (run setup-device.ts first)');
  console.log('  3. Check that the token matches one in the database\n');
  client.end();
});

client.on('close', () => {
  console.log('Connection closed');
});
