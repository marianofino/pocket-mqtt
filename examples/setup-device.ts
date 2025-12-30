#!/usr/bin/env tsx
/**
 * Device Token Setup Script
 * 
 * This script helps you create device tokens in the database
 * for testing MQTT authentication.
 * 
 * Prerequisites:
 * 1. Run database migrations: npm run db:push
 * 2. (Optional) Inspect schema: npm run db:studio
 * 
 * Usage: npx tsx examples/setup-device.ts
 */
import { eq, desc } from 'drizzle-orm';
import { getDbClient, disconnectDb } from '../src/database.js';
import { deviceToken, type DeviceToken } from '../src/db/schema.js';

const devices = [
  {
    deviceId: 'sensor-001',
    token: 'my-secure-device-token-123',
    name: 'Temperature Sensor 001',
    labels: ['sensor', 'temperature'],
    notes: 'Temperature sensor for testing'
  },
  {
    deviceId: 'subscriber-001',
    token: 'subscriber-token-456',
    name: 'MQTT Subscriber 001',
    labels: ['subscriber', 'test'],
    notes: 'MQTT subscriber client for testing'
  },
  {
    deviceId: 'sensor-002',
    token: 'sensor-002-token-789',
    name: 'Humidity Sensor 002',
    labels: ['sensor', 'humidity'],
    notes: 'Humidity sensor for testing'
  }
];

console.log('=== Device Token Setup ===\n');

async function checkDatabaseSetup(): Promise<boolean> {
  const db = getDbClient();

  try {
    // Try to query the DeviceToken table to check if migrations are applied
    await db.select({ id: deviceToken.id }).from(deviceToken).limit(1);
    return true;
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('no such table')) {
      console.error('✗ Database not initialized!\n');
      console.log('The DeviceToken table does not exist. Please run database migrations first:\n');
      console.log('  1. npm install (if you have not already)');
      console.log('  2. npm run db:push\n');
      console.log('Then run this script again.\n');
      return false;
    }
    throw error;
  }
}

async function findDevice(deviceId: string): Promise<DeviceToken | undefined> {
  const db = getDbClient();
  const result = await db
    .select()
    .from(deviceToken)
    .where(eq(deviceToken.deviceId, deviceId))
    .limit(1);

  return result[0];
}

async function createDevice(deviceId: string, token: string, name: string, labels?: string[], notes?: string): Promise<void> {
  const db = getDbClient();
  await db.insert(deviceToken).values({
    deviceId,
    token,
    name,
    labels: labels ? JSON.stringify(labels) : null,
    notes: notes || null,
    expiresAt: null
  });
}

async function listDevices(): Promise<DeviceToken[]> {
  const db = getDbClient();
  return db.select().from(deviceToken).orderBy(desc(deviceToken.createdAt));
}

async function setupDevices() {
  // Check if database is set up
  const isSetup = await checkDatabaseSetup();
  if (!isSetup) {
    process.exit(1);
  }

  try {
    console.log('Creating device tokens...\n');

    for (const device of devices) {
      // Check if device already exists
      const existing = await findDevice(device.deviceId);

      if (existing) {
        console.log(`⚠ Device "${device.deviceId}" already exists, skipping...`);
        continue;
      }

      // Create device token
      await createDevice(device.deviceId, device.token, device.name, device.labels, device.notes);

      console.log(`✓ Created device: ${device.deviceId}`);
      console.log(`  Name: ${device.name}`);
      console.log(`  Token: ${device.token}`);
      console.log(`  Labels: ${device.labels?.join(', ') || 'None'}`);
      console.log(`  Notes: ${device.notes}\n`);
    }

    // List all devices
    const allDevices = await listDevices();

    console.log('\n=== All Device Tokens ===');
    console.log(`Total: ${allDevices.length}\n`);

    allDevices.forEach((device, index) => {
      console.log(`${index + 1}. Device ID: ${device.deviceId}`);
      console.log(`   Name: ${device.name}`);
      console.log(`   Token: ${device.token}`);
      console.log(`   Labels: ${device.labels || 'None'}`);
      console.log(`   Notes: ${device.notes || 'None'}`);
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
    await disconnectDb();
  }
}

setupDevices().catch((error) => {
  console.error('Fatal error:', error);
  disconnectDb().finally(() => process.exit(1));
});
