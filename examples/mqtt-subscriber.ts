#!/usr/bin/env tsx
/**
 * MQTT Subscriber Example
 * 
 * This example demonstrates how to subscribe to topics on the PocketMQTT broker
 * using single-credential token authentication.
 * 
 * Prerequisites:
 * 1. Start the PocketMQTT server: npm run dev
 * 2. Create a device token in the database (see setup-device.ts)
 * 3. Run this script: npx tsx examples/mqtt-subscriber.ts
 */

import { connect } from 'mqtt';

// Device token - this should match a token in your DeviceToken table
const DEVICE_TOKEN = 'subscriber-token-456';

// MQTT broker connection settings
const MQTT_HOST = 'localhost';
const MQTT_PORT = 1883;

// Topics to subscribe to (supports wildcards)
const TOPICS = [
  'sensors/#',      // All sensor topics
  'devices/+/status' // Device status topics
];

console.log('=== MQTT Subscriber Example ===\n');

// Connect to MQTT broker with single-credential authentication
const client = connect(`mqtt://${MQTT_HOST}:${MQTT_PORT}`, {
  clientId: `subscriber-${Date.now()}`,
  username: DEVICE_TOKEN,
  // No password - single-credential mode
  clean: true,
  reconnectPeriod: 1000,
});

client.on('connect', () => {
  console.log('✓ Connected to MQTT broker');
  console.log(`  Token: ${DEVICE_TOKEN}\n`);
  
  // Subscribe to topics
  console.log('Subscribing to topics:');
  TOPICS.forEach(topic => {
    client.subscribe(topic, (err) => {
      if (err) {
        console.error(`✗ Failed to subscribe to ${topic}:`, err.message);
      } else {
        console.log(`✓ Subscribed to: ${topic}`);
      }
    });
  });
  
  console.log('\nWaiting for messages... (Press Ctrl+C to exit)\n');
});

client.on('message', (topic, message) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Message received:`);
  console.log(`  Topic: ${topic}`);
  
  try {
    const payload = JSON.parse(message.toString());
    console.log(`  Payload: ${JSON.stringify(payload, null, 2)}`);
  } catch (e) {
    console.log(`  Payload: ${message.toString()}`);
  }
  console.log('');
});

client.on('error', (err) => {
  console.error('✗ Connection error:', err.message);
  console.log('\nTroubleshooting:');
  console.log('1. Make sure the PocketMQTT server is running (npm run dev)');
  console.log('2. Verify the device token exists in the database');
  console.log('3. Check that DEVICE_TOKEN matches a token in the database\n');
  process.exit(1);
});

client.on('close', () => {
  console.log('✓ Disconnected from MQTT broker');
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\nShutting down...');
  client.end(false, {}, () => {
    console.log('✓ Disconnected');
    process.exit(0);
  });
});
