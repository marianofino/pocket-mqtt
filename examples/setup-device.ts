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
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { getDbAdapter, getDbClient, disconnectDb } from '../src/core/database.js';
import * as sqliteSchema from '../src/core/db/schema.js';
import * as postgresSchema from '../src/core/db/schema.pg.js';

type DbContext =
  | {
      adapter: 'sqlite';
      db: BetterSQLite3Database<typeof sqliteSchema>;
      deviceTable: typeof sqliteSchema.deviceToken;
    }
  | {
      adapter: 'postgres';
      db: PostgresJsDatabase<typeof postgresSchema>;
      deviceTable: typeof postgresSchema.deviceToken;
    };

type DeviceTokenRow = sqliteSchema.DeviceToken | postgresSchema.DeviceToken;

function createDbContext(): DbContext {
  const adapter = getDbAdapter();
  const db = getDbClient();

  if (adapter === 'postgres') {
    return {
      adapter,
      db: db as PostgresJsDatabase<typeof postgresSchema>,
      deviceTable: postgresSchema.deviceToken
    };
  }

  return {
    adapter: 'sqlite',
    db: db as BetterSQLite3Database<typeof sqliteSchema>,
    deviceTable: sqliteSchema.deviceToken
  };
}

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

async function checkDatabaseSetup(context: DbContext): Promise<boolean> {
  try {
    // Try to query the DeviceToken table to check if migrations are applied
    if (context.adapter === 'postgres') {
      await context.db.select().from(context.deviceTable).limit(1);
    } else {
      await context.db.select().from(context.deviceTable).limit(1);
    }
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

async function findDevice(context: DbContext, deviceId: string): Promise<DeviceTokenRow | undefined> {
  const result = context.adapter === 'postgres'
    ? await context.db
        .select()
        .from(context.deviceTable)
        .where(eq(context.deviceTable.deviceId, deviceId))
        .limit(1)
    : await context.db
        .select()
        .from(context.deviceTable)
        .where(eq(context.deviceTable.deviceId, deviceId))
        .limit(1);

  return result[0];
}

async function createDevice(
  context: DbContext,
  deviceId: string,
  token: string,
  name: string,
  labels?: string[],
  notes?: string
): Promise<void> {
  if (context.adapter === 'postgres') {
    await context.db.insert(context.deviceTable).values({
      deviceId,
      token,
      name,
      labels: labels ? JSON.stringify(labels) : null,
      notes: notes || null,
      expiresAt: null
    });
    return;
  }

  await context.db.insert(context.deviceTable).values({
    deviceId,
    token,
    name,
    labels: labels ? JSON.stringify(labels) : null,
    notes: notes || null,
    expiresAt: null
  });
}

async function listDevices(context: DbContext): Promise<DeviceTokenRow[]> {
  if (context.adapter === 'postgres') {
    return context.db.select().from(context.deviceTable).orderBy(desc(context.deviceTable.createdAt));
  }

  return context.db.select().from(context.deviceTable).orderBy(desc(context.deviceTable.createdAt));
}

async function setupDevices() {
  const context = createDbContext();

  // Check if database is set up
  const isSetup = await checkDatabaseSetup(context);
  if (!isSetup) {
    process.exit(1);
  }

  try {
    console.log('Creating device tokens...\n');

    for (const device of devices) {
      // Check if device already exists
      const existing = await findDevice(context, device.deviceId);

      if (existing) {
        console.log(`⚠ Device "${device.deviceId}" already exists, skipping...`);
        continue;
      }

      // Create device token
      await createDevice(context, device.deviceId, device.token, device.name, device.labels, device.notes);

      console.log(`✓ Created device: ${device.deviceId}`);
      console.log(`  Name: ${device.name}`);
      console.log(`  Token: ${device.token}`);
      console.log(`  Labels: ${device.labels?.join(', ') || 'None'}`);
      console.log(`  Notes: ${device.notes}\n`);
    }

    // List all devices
  const allDevices = await listDevices(context);

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
