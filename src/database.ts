import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PrismaRepository } from './repository/PrismaRepository.js';
import type { IRepository } from './repository/interfaces.js';

let repository: IRepository | null = null;
let prisma: PrismaClient | null = null;

/**
 * Database adapter types supported by the application.
 */
export type DatabaseAdapter = 'sqlite' | 'postgres';

/**
 * Get the database adapter from environment variable.
 * Defaults to 'sqlite' if not specified.
 */
export function getDatabaseAdapter(): DatabaseAdapter {
  const adapter = process.env.DATABASE_ADAPTER?.toLowerCase();
  if (adapter === 'postgres' || adapter === 'postgresql') {
    return 'postgres';
  }
  return 'sqlite';
}

/**
 * Create a Prisma client with the appropriate adapter based on DATABASE_ADAPTER env var.
 */
function createPrismaClient(): PrismaClient {
  const adapter = getDatabaseAdapter();

  if (adapter === 'postgres') {
    // PostgreSQL adapter using pg driver
    const connectionString = process.env.DATABASE_URL || 'postgresql://localhost:5432/pocketmqtt';
    if (!process.env.DATABASE_URL) {
      console.warn(
        'DATABASE_URL is not set; defaulting to postgresql://localhost:5432/pocketmqtt. ' +
          'Ensure this is the intended database configuration.'
      );
    }
    const pool = new Pool({ connectionString });
    const pgAdapter = new PrismaPg(pool);
    const client = new PrismaClient({ adapter: pgAdapter });

    // Perform a non-blocking connectivity check for PostgreSQL to surface configuration issues early.
    // We don't await this to keep the API synchronous, but we log clear errors if the connection fails.
    client.$queryRaw`SELECT 1`.catch((err: unknown) => {
      console.error(
        'Failed to connect to PostgreSQL database during initialization. ' +
          'Verify that DATABASE_URL is correct and the database is reachable.',
        err
      );
    });

    return client;
  } else {
    // SQLite adapter using LibSQL
    const dbPath = process.env.DATABASE_URL?.replace('file:', '').split('?')[0] || './dev.db';
    const sqliteAdapter = new PrismaLibSql({
      url: `file:${dbPath}`
    });
    const client = new PrismaClient({ adapter: sqliteAdapter });

    // Enable WAL mode for SQLite using Prisma (safe - no user input)
    // This is done asynchronously but we don't wait for it to avoid blocking
    client.$executeRaw`PRAGMA journal_mode=WAL;`.catch((err: unknown) => {
      console.error('Failed to enable WAL mode:', err);
      // Note: We log the error but don't fail fast here to avoid breaking the synchronous API
      // WAL mode is an optimization, not a requirement
    });

    return client;
  }
}

/**
 * Get or create a singleton repository instance.
 * Uses the Repository Pattern as per ARCHITECTURE.md to abstract Prisma calls.
 */
export function getRepository(): IRepository {
  if (!repository) {
    prisma = createPrismaClient();
    repository = new PrismaRepository(prisma);
  }
  return repository;
}

/**
 * Get or create a singleton Prisma client instance.
 * @deprecated Use getRepository() instead for Repository Pattern abstraction.
 */
export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    prisma = createPrismaClient();
  }
  return prisma;
}

/**
 * Reset the Prisma client singleton (for testing).
 */
export function resetPrismaClient(): void {
  prisma = null;
  repository = null;
}

/**
 * Disconnect the repository/Prisma client and clean up resources.
 */
export async function disconnectPrisma(): Promise<void> {
  if (repository) {
    await repository.disconnect();
    repository = null;
    prisma = null;
  } else if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
}
