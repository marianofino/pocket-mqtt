#!/usr/bin/env tsx
/**
 * Device Token Setup Script
 * 
 * This script seeds a demo tenant and device tokens in the database
 * for testing MQTT authentication.
 * Plaintext tokens are **not** stored; hashes are persisted for authentication.
 * 
 * Prerequisites:
 * 1. Run database migrations: pnpm db:push
 * 2. (Optional) Inspect schema: pnpm db:studio
 * 
 * Usage: npx tsx examples/setup-device.ts
 */
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { eq, desc } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { getDbAdapter, getDbClient, disconnectDb, schemaPg } from '@pocket-mqtt/db';
import * as sqliteSchema from '@pocket-mqtt/db';
import { generateTenantApiKey, hashDeviceToken } from '@pocket-mqtt/core';

type DbContext =
  | {
      adapter: 'sqlite';
      db: BetterSQLite3Database<typeof sqliteSchema>;
      deviceTable: typeof sqliteSchema.deviceToken;
      tenantTable: typeof sqliteSchema.tenant;
    }
  | {
      adapter: 'postgres';
      db: PostgresJsDatabase<typeof schemaPg>;
      deviceTable: typeof schemaPg.deviceToken;
      tenantTable: typeof schemaPg.tenant;
    };

type DeviceTokenRow = sqliteSchema.DeviceToken | schemaPg.DeviceToken;
type TenantRow = sqliteSchema.Tenant | schemaPg.Tenant;

const DEFAULT_TENANT_NAME = process.env.TENANT_NAME?.trim() || 'demo';

// Ensure DATABASE_URL points to the same SQLite file that migrations use.
function ensureDatabaseUrl(): void {
  if (process.env.DB_ADAPTER && process.env.DB_ADAPTER.toLowerCase().startsWith('postgres')) {
    return; // Respect explicit postgres configuration
  }

  // If DATABASE_URL points to root dev.db but the workspace DB is under packages/db,
  // prefer the migrated file so examples align with `pnpm db:push` output.
  if (process.env.DATABASE_URL) {
    const current = process.env.DATABASE_URL.replace('file:', '').split('?')[0];
    const currentAbs = resolve(current);
    const workspaceDb = resolve('packages/db/dev.db');

    if (existsSync(workspaceDb) && currentAbs.endsWith(`${resolve('dev.db')}`)) {
      process.env.DATABASE_URL = `file:${workspaceDb}`;
      console.log(`Using SQLite database at ${workspaceDb} (overriding .env dev.db)\n`);
    }
    return;
  }

  const candidates = [
    'packages/db/dev.db', // where pnpm db:push writes by default (cwd = packages/db)
    'dev.db'
  ];

  const chosen = candidates.find((p) => existsSync(resolve(p))) ?? candidates[0];
  const abs = resolve(chosen);
  process.env.DATABASE_URL = `file:${abs}`;
  console.log(`Using SQLite database at ${abs}\n`);
}

/**
 * Shape for seeding demo device tokens.
 */
export type DeviceSeed = {
  deviceId: string;
  token: string;
  name: string;
  labels?: string[];
  notes?: string;
};

function createDbContext(): DbContext {
  const adapter = getDbAdapter();
  const db = getDbClient();

  if (adapter === 'postgres') {
    return {
      adapter,
      db: db as PostgresJsDatabase<typeof schemaPg>,
      deviceTable: schemaPg.deviceToken,
      tenantTable: schemaPg.tenant
    };
  }

  return {
    adapter: 'sqlite',
    db: db as BetterSQLite3Database<typeof sqliteSchema>,
    deviceTable: sqliteSchema.deviceToken,
    tenantTable: sqliteSchema.tenant
  };
}

const devices: DeviceSeed[] = [
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

const deviceSeedLookup = new Map(devices.map((device) => [device.deviceId, device]));

console.log('=== Device Token Setup ===\n');

async function checkDatabaseSetup(context: DbContext): Promise<boolean> {
  try {
    if (context.adapter === 'postgres') {
      const db = context.db as PostgresJsDatabase<typeof schemaPg>;
      await db.select().from(context.deviceTable).limit(1);
      await db.select().from(context.tenantTable).limit(1);
    } else {
      const db = context.db as BetterSQLite3Database<typeof sqliteSchema>;
      await db.select().from(context.deviceTable).limit(1);
      await db.select().from(context.tenantTable).limit(1);
    }
    return true;
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('no such table')) {
      console.error('✗ Database not initialized!\n');
      console.log('The DeviceToken table does not exist. Please run database migrations first:\n');
      console.log('  1. pnpm install (if you have not already)');
      console.log('  2. pnpm db:push\n');
      console.log('Then run this script again.\n');
      return false;
    }
    throw error;
  }
}

async function findTenant(context: DbContext, tenantName: string): Promise<TenantRow | undefined> {
  if (context.adapter === 'postgres') {
    const db = context.db as PostgresJsDatabase<typeof schemaPg>;
    const result = await db
      .select()
      .from(context.tenantTable)
      .where(eq(context.tenantTable.name, tenantName))
      .limit(1);
    return result[0];
  }

  const db = context.db as BetterSQLite3Database<typeof sqliteSchema>;
  const result = await db
    .select()
    .from(context.tenantTable)
    .where(eq(context.tenantTable.name, tenantName))
    .limit(1);
  return result[0];
}

async function createTenant(context: DbContext, tenantName: string): Promise<TenantRow> {
  const tenantApiKey = generateTenantApiKey();

  if (context.adapter === 'postgres') {
    const [tenant] = await context.db
      .insert(context.tenantTable)
      .values({ name: tenantName, apiKey: tenantApiKey })
      .returning();

    return tenant;
  }

  const [tenant] = await context.db
    .insert(context.tenantTable)
    .values({ name: tenantName, apiKey: tenantApiKey })
    .returning();

  return tenant;
}

async function ensureTenant(context: DbContext, tenantName: string): Promise<TenantRow> {
  const existing = await findTenant(context, tenantName);
  if (existing) {
    return existing;
  }

  console.log(`Creating tenant "${tenantName}"...`);
  const tenant = await createTenant(context, tenantName);
  console.log(`✓ Tenant created with API key: ${tenant.apiKey}\n`);
  return tenant;
}

async function findDevice(context: DbContext, deviceId: string): Promise<DeviceTokenRow | undefined> {
  if (context.adapter === 'postgres') {
    const db = context.db as PostgresJsDatabase<typeof schemaPg>;
    const result = await db
      .select()
      .from(context.deviceTable)
      .where(eq(context.deviceTable.deviceId, deviceId))
      .limit(1);
    return result[0];
  }

  const db = context.db as BetterSQLite3Database<typeof sqliteSchema>;
  const result = await db
    .select()
    .from(context.deviceTable)
    .where(eq(context.deviceTable.deviceId, deviceId))
    .limit(1);

  return result[0];
}

async function createDevice(
  context: DbContext,
  tenantId: number,
  seed: DeviceSeed
): Promise<DeviceTokenRow> {
  const tokenHash = await hashDeviceToken(seed.token);
  const values = {
    tenantId,
    deviceId: seed.deviceId,
    tokenHash,
    name: seed.name,
    labels: seed.labels ? JSON.stringify(seed.labels) : null,
    notes: seed.notes || null,
    expiresAt: null
  };

  if (context.adapter === 'postgres') {
    const db = context.db as PostgresJsDatabase<typeof schemaPg>;
    const [inserted] = await db.insert(context.deviceTable).values(values).returning();
    return inserted;
  }

  const db = context.db as BetterSQLite3Database<typeof sqliteSchema>;
  const [inserted] = await db.insert(context.deviceTable).values(values).returning();
  return inserted;
}

async function listDevices(context: DbContext): Promise<DeviceTokenRow[]> {
  if (context.adapter === 'postgres') {
    const db = context.db as PostgresJsDatabase<typeof schemaPg>;
    return db.select().from(context.deviceTable).orderBy(desc(context.deviceTable.createdAt));
  }

  const db = context.db as BetterSQLite3Database<typeof sqliteSchema>;
  return db.select().from(context.deviceTable).orderBy(desc(context.deviceTable.createdAt));
}

/**
 * Seed device tokens for a tenant. Creates the tenant if it does not exist.
 *
 * @param context - Database context (sqlite or postgres)
 * @param tenantName - Name of the tenant to use/create
 * @param deviceSeeds - Device token definitions to insert
 * @returns Tenant record plus created/skipped device token metadata
 */
export async function seedDevicesForTenant(
  context: DbContext,
  tenantName: string,
  deviceSeeds: DeviceSeed[]
): Promise<{ tenant: TenantRow; createdDevices: DeviceTokenRow[]; skipped: string[] }> {
  const tenant = await ensureTenant(context, tenantName);

  const createdDevices: DeviceTokenRow[] = [];
  const skipped: string[] = [];

  for (const device of deviceSeeds) {
    const existing = await findDevice(context, device.deviceId);

    if (existing) {
      skipped.push(device.deviceId);
      continue;
    }

    const created = await createDevice(context, tenant.id, device);
    createdDevices.push(created);
  }

  return { tenant, createdDevices, skipped };
}

async function setupDevices(): Promise<void> {
  ensureDatabaseUrl();
  const context = createDbContext();

  const isSetup = await checkDatabaseSetup(context);
  if (!isSetup) {
    process.exit(1);
  }

  try {
    console.log('Creating demo tenant and device tokens...\n');

    const { tenant, createdDevices, skipped } = await seedDevicesForTenant(
      context,
      DEFAULT_TENANT_NAME,
      devices
    );

    if (createdDevices.length > 0) {
      createdDevices.forEach((device) => {
        const seed = deviceSeedLookup.get(device.deviceId);
        console.log(`✓ Created device: ${device.deviceId}`);
        console.log(`  Tenant ID: ${device.tenantId}`);
        if (seed) {
          console.log(`  Token: ${seed.token} (plaintext, not stored)`);
        }
        console.log(`  Token Hash: ${device.tokenHash}`);
        console.log(`  Labels: ${device.labels || 'None'}`);
        console.log(`  Notes: ${device.notes || 'None'}\n`);
      });
    }

    if (skipped.length > 0) {
      skipped.forEach((deviceId) => {
        console.log(`⚠ Device "${deviceId}" already exists, skipping...`);
      });
      console.log('');
    }

    const allDevices = await listDevices(context);

    console.log('\n=== All Device Tokens ===');
    console.log(`Tenant: ${tenant.name} (id=${tenant.id})`);
    console.log(`Total: ${allDevices.length}\n`);

    allDevices.forEach((device, index) => {
      console.log(`${index + 1}. Device ID: ${device.deviceId}`);
      console.log(`   Tenant ID: ${device.tenantId}`);
      console.log(`   Name: ${device.name}`);
      console.log(`   Token Hash: ${device.tokenHash}`);
      console.log('   Plaintext token: not stored (see seed input)');
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

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  setupDevices().catch((error) => {
    console.error('Fatal error:', error);
    disconnectDb().finally(() => process.exit(1));
  });
}
