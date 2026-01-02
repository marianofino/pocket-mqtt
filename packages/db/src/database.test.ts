import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resolve } from 'node:path';
import { existsSync, unlinkSync } from 'node:fs';
import { getDbAdapter, getDbClient, resetDbClient } from './database.js';

const TEST_DB_PATH = resolve('dev.test.db');
const TEST_DB_URL = `file:${TEST_DB_PATH}`;

describe('database', () => {
  beforeEach(async () => {
    vi.unstubAllEnvs();
    vi.stubEnv('DATABASE_URL', TEST_DB_URL);
    vi.stubEnv('DB_ADAPTER', 'sqlite');
    if (existsSync(TEST_DB_PATH)) {
      unlinkSync(TEST_DB_PATH);
    }
    await resetDbClient();
  });

  afterEach(async () => {
    await resetDbClient();
    if (existsSync(TEST_DB_PATH)) {
      unlinkSync(TEST_DB_PATH);
    }
    vi.unstubAllEnvs();
  });

  it('falls back to sqlite adapter by default', () => {
    vi.unstubAllEnvs();
    expect(getDbAdapter()).toBe('sqlite');

    vi.stubEnv('DB_ADAPTER', 'postgres');
    expect(getDbAdapter()).toBe('postgres');
  });

  it('creates a singleton sqlite client and rebuilds after reset', async () => {
    const client1 = getDbClient();
    const client2 = getDbClient();

    expect(client1).toBe(client2);
    expect(existsSync(TEST_DB_PATH)).toBe(true);

    await resetDbClient();

    const client3 = getDbClient();
    expect(client3).not.toBe(client1);
  });
});
