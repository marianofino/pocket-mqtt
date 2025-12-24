import { beforeAll, describe, expect, it, afterAll } from 'vitest';
import { execSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';

type PrismaModule = {
  getPrismaClient: () => any;
  disconnectPrisma: () => Promise<void>;
};

describe('build artifacts', () => {
  let prismaModule: PrismaModule;

  const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
  const distDatabaseUrl = pathToFileURL(resolve(projectRoot, 'dist/database.js')).href;

  beforeAll(async () => {
    // Ensure the latest build artifacts exist before importing from dist
    execSync('npm run build', { cwd: projectRoot, stdio: 'pipe' });
    prismaModule = (await import(distDatabaseUrl)) as PrismaModule;
  }, 60_000);

  afterAll(async () => {
    if (prismaModule) {
      await prismaModule.disconnectPrisma();
    }
  });

  it('includes the DeviceToken delegate after building', () => {
    const prisma = prismaModule.getPrismaClient();
    expect(typeof prisma.deviceToken?.findUnique).toBe('function');
  });
});
