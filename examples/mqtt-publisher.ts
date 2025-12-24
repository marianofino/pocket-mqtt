#!/usr/bin/env tsx
/**
 * MQTT Publisher Example
 * 
 * This example demonstrates how to publish messages to the PocketMQTT broker
 * using device token authentication.
 * 
 * Prerequisites:
 * 1. Start the PocketMQTT server: npm run dev
 * 2. Create a device token in the database (see setup-device.ts)
 * 3. Run this script: npx tsx examples/mqtt-publisher.ts
 */

import { connect } from 'mqtt';

// Device credentials - these should match a record in your DeviceToken table
const DEVICE_ID = 'sensor-001';
const DEVICE_TOKEN = 'my-secure-device-token-123';

// MQTT broker connection settings
const MQTT_HOST = 'localhost';
const MQTT_PORT = 1883;

console.log('=== MQTT Publisher Example ===\n');

// Connect to MQTT broker with authentication
const client = connect(`mqtt://${MQTT_HOST}:${MQTT_PORT}`, {
  clientId: DEVICE_ID,
  username: DEVICE_ID,
  password: DEVICE_TOKEN,
  clean: true,
  reconnectPeriod: 1000,
});

client.on('connect', () => {
  console.log('✓ Connected to MQTT broker');
  console.log(`  Device ID: ${DEVICE_ID}\n`);
  
  // Publish a test message
  const topic = 'sensors/temperature';
  const message = {
    deviceId: DEVICE_ID,
    temperature: 25.5,
    timestamp: new Date().toISOString()
  };
  
  console.log(`Publishing to topic: ${topic}`);
  console.log(`Message: ${JSON.stringify(message, null, 2)}\n`);
  
  client.publish(topic, JSON.stringify(message), (err) => {
    if (err) {
      console.error('✗ Failed to publish:', err.message);
    } else {
      console.log('✓ Message published successfully');
    }
    
    // Publish a few more messages
    let count = 0;
    const interval = setInterval(() => {
      count++;
      const msg = {
        deviceId: DEVICE_ID,
        temperature: 25 + Math.random() * 5,
        humidity: 60 + Math.random() * 10,
        timestamp: new Date().toISOString()
      };
      
      client.publish(topic, JSON.stringify(msg), (err) => {
        if (err) {
          console.error(`✗ Failed to publish message ${count}:`, err.message);
        } else {
          console.log(`✓ Published message ${count}: temp=${msg.temperature.toFixed(1)}°C, humidity=${msg.humidity.toFixed(1)}%`);
        }
      });
      
      if (count >= 5) {
        clearInterval(interval);
        console.log('\n✓ Finished publishing messages');
        console.log('  Press Ctrl+C to exit\n');
      }
    }, 2000);
  });
});

client.on('error', (err) => {
  console.error('✗ Connection error:', err.message);
  console.log('\nTroubleshooting:');
  console.log('1. Make sure the PocketMQTT server is running (npm run dev)');
  console.log('2. Verify the device token exists in the database');
  console.log('3. Check that DEVICE_ID and DEVICE_TOKEN match the database record\n');
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
