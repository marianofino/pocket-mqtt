#!/usr/bin/env tsx
/**
 * Device Token Setup Script
 * 
 * This script helps you create device tokens in the database
 * for testing MQTT authentication.
 * 
 * Prerequisites:
 * 1. Run database migrations: npx prisma migrate deploy
 * 2. Generate Prisma client: npx prisma generate
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

async function checkDatabaseSetup() {
  const prisma = getPrismaClient();
  
  try {
    // Try to query the DeviceToken table to check if migrations are applied
    await prisma.deviceToken.findFirst();
    return true;
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('no such table')) {
      console.error('✗ Database not initialized!\n');
      console.log('The DeviceToken table does not exist. Please run database migrations first:\n');
      console.log('  1. npx prisma migrate deploy');
      console.log('  2. npx prisma generate\n');
      console.log('Then run this script again.\n');
      return false;
    }
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function setupDevices() {
  // Check if database is set up
  const isSetup = await checkDatabaseSetup();
  if (!isSetup) {
    process.exit(1);
  }
  
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
