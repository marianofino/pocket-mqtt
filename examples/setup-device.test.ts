import { dirname, join } from 'node:path';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { desc } from 'drizzle-orm';
import * as schemaSqlite from '@pocket/db';
import type { DeviceToken, Tenant } from '@pocket/db';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { seedDevicesForTenant } from './setup-device.js';

const DEVICE_SEEDS = [
  {
    deviceId: 'sensor-001',
    token: 'token-1',
    name: 'Sensor 1',
    labels: ['a', 'b'] as string[],
    notes: 'First'
  },
  {
    deviceId: 'subscriber-001',
    token: 'token-2',
    name: 'Subscriber',
    labels: ['sub'] as string[],
    notes: 'Second'
  }
];

const TENANT_NAME = 'demo';

const testSchema = {
  tenant: schemaSqlite.tenant,
  deviceToken: schemaSqlite.deviceToken,
};

type SqliteContext = {
  adapter: 'sqlite';
  db: BetterSQLite3Database<typeof testSchema>;
  deviceTable: typeof testSchema.deviceToken;
  tenantTable: typeof testSchema.tenant;
};

function createTempDbPath(): string {
  return join(mkdtempSync(join(tmpdir(), 'pocket-mqtt-examples-')), 'dev.db');
}

function bootstrapDatabase(dbPath: string): { context: SqliteContext; dispose: () => void } {
  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.exec(`
    CREATE TABLE "Tenant" (
      "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      "name" text NOT NULL UNIQUE,
      "apiKey" text NOT NULL UNIQUE,
      "createdAt" integer NOT NULL DEFAULT (unixepoch('now'))
    );
    CREATE TABLE "DeviceToken" (
      "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      "tenantId" integer NOT NULL,
      "deviceId" text NOT NULL UNIQUE,
      "token" text NOT NULL UNIQUE,
      "name" text NOT NULL,
      "labels" text,
      "notes" text,
      "createdAt" integer NOT NULL DEFAULT (unixepoch('now')),
      "expiresAt" integer,
      CONSTRAINT "DeviceToken_tenantId_fk" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE
    );
    CREATE INDEX "DeviceToken_token_idx" ON "DeviceToken" ("token");
    CREATE INDEX "DeviceToken_deviceId_idx" ON "DeviceToken" ("deviceId");
  `);

  const db = drizzle(sqlite, { schema: testSchema });
  const context: SqliteContext = {
    adapter: 'sqlite' as const,
    db,
    deviceTable: testSchema.deviceToken,
    tenantTable: testSchema.tenant
  };

  const dispose = () => {
    sqlite.close();
    rmSync(dirname(dbPath), { recursive: true, force: true });
  };

  return { context, dispose };
}

describe('setup-device seed helper', () => {
  let dispose: () => void;
  let context: any;

  beforeEach(() => {
    const dbPath = createTempDbPath();
    const bootstrapped = bootstrapDatabase(dbPath);
    dispose = bootstrapped.dispose;
    context = bootstrapped.context;
  });

  afterEach(() => {
    dispose?.();
  });

  it('creates a tenant and seeds device tokens with tenant linkage', async () => {
    const result = await seedDevicesForTenant(context, TENANT_NAME, DEVICE_SEEDS);

    const tenants = (await context.db.select().from(schemaSqlite.tenant)) as Tenant[];
    expect(tenants).toHaveLength(1);
    expect(tenants[0].name).toBe(TENANT_NAME);
    const tenantId = tenants[0].id;

    const tokens = (await context.db
      .select()
      .from(schemaSqlite.deviceToken)
      .orderBy(desc(schemaSqlite.deviceToken.deviceId))) as DeviceToken[];

    expect(tokens).toHaveLength(DEVICE_SEEDS.length);
    tokens.forEach((token) => {
      expect(token.tenantId).toBe(tenantId);
    });

    expect(result.createdDevices.map((d: DeviceToken) => d.deviceId).sort()).toEqual(
      DEVICE_SEEDS.map((d) => d.deviceId).sort()
    );
    expect(result.tenant.id).toBe(tenantId);
  });
});
