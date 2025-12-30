import { beforeAll, describe, expect, it, afterAll } from 'vitest';
import { execSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';

type DbModule = {
  getDbClient: () => any;
  disconnectDb: () => Promise<void>;
};

describe('build artifacts', () => {
  let dbModule: DbModule;

  const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
  const distDatabaseUrl = pathToFileURL(resolve(projectRoot, 'dist/core/database.js')).href;

  beforeAll(async () => {
    // Ensure the latest build artifacts exist before importing from dist
    execSync('npm run build', { cwd: projectRoot, stdio: 'pipe' });
    dbModule = (await import(distDatabaseUrl)) as DbModule;
  }, 60_000);

  afterAll(async () => {
    if (dbModule) {
      await dbModule.disconnectDb();
    }
  });

  it('includes the database client after building', () => {
    const db = dbModule.getDbClient();
    expect(db).toBeDefined();
    expect(typeof db.select).toBe('function');
    expect(typeof db.insert).toBe('function');
    expect(typeof db.delete).toBe('function');
  });
});
