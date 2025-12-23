#!/usr/bin/env tsx
/**
 * Device Token Setup Script
 * 
 * This script helps you create device tokens in the database
 * for testing MQTT authentication.
 * 
 * Usage: npx tsx examples/setup-device.ts
 */

import { getPrismaClient } from '../src/database.js';

const devices = [
  {
    deviceId: 'sensor-001',
    token: 'my-secure-device-token-123',
    description: 'Temperature sensor'
  },
  {
    deviceId: 'subscriber-001',
    token: 'subscriber-token-456',
    description: 'MQTT subscriber client'
  },
  {
    deviceId: 'sensor-002',
    token: 'sensor-002-token-789',
    description: 'Humidity sensor'
  }
];

console.log('=== Device Token Setup ===\n');

async function setupDevices() {
  const prisma = getPrismaClient();
  
  try {
    console.log('Creating device tokens...\n');
    
    for (const device of devices) {
      // Check if device already exists
      const existing = await prisma.deviceToken.findUnique({
        where: { deviceId: device.deviceId }
      });
      
      if (existing) {
        console.log(`⚠ Device "${device.deviceId}" already exists, skipping...`);
        continue;
      }
      
      // Create device token
      await prisma.deviceToken.create({
        data: {
          deviceId: device.deviceId,
          token: device.token,
          // Optional: set expiration (null means never expires)
          expiresAt: null
        }
      });
      
      console.log(`✓ Created device: ${device.deviceId}`);
      console.log(`  Token: ${device.token}`);
      console.log(`  Description: ${device.description}\n`);
    }
    
    // List all devices
    const allDevices = await prisma.deviceToken.findMany({
      orderBy: { createdAt: 'desc' }
    });
    
    console.log('\n=== All Device Tokens ===');
    console.log(`Total: ${allDevices.length}\n`);
    
    allDevices.forEach((device, index) => {
      console.log(`${index + 1}. Device ID: ${device.deviceId}`);
      console.log(`   Token: ${device.token}`);
      console.log(`   Created: ${device.createdAt}`);
      console.log(`   Expires: ${device.expiresAt || 'Never'}\n`);
    });
    
    console.log('✓ Setup complete!\n');
    console.log('You can now run the MQTT publisher/subscriber examples:');
    console.log('  npx tsx examples/mqtt-publisher.ts');
    console.log('  npx tsx examples/mqtt-subscriber.ts\n');
    
  } catch (error) {
    console.error('✗ Error setting up devices:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

setupDevices().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
