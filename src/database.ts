import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PrismaRepository } from './repository/PrismaRepository.js';
import type { IRepository } from './repository/interfaces.js';

let repository: IRepository | null = null;
let prisma: PrismaClient | null = null;
let initializationPromise: Promise<IRepository> | null = null;
let pgPool: Pool | null = null;

/**
 * Database adapter types supported by the application.
 */
export type DatabaseAdapter = 'sqlite' | 'postgres';

/**
 * Get the database adapter from environment variable.
 * Defaults to 'sqlite' if not specified.
 * Accepts both 'postgres' and 'postgresql' as valid values for PostgreSQL.
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
    // Store pool reference for cleanup during disconnect
    pgPool = new Pool({ connectionString });
    const pgAdapter = new PrismaPg(pgPool);
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
 * Thread-safe initialization to prevent race conditions in high-concurrency scenarios.
 */
export function getRepository(): IRepository {
  if (repository) {
    return repository;
  }

  // If already initializing, wait for it to complete
  if (initializationPromise) {
    throw new Error('Repository is being initialized asynchronously. Use getRepositoryAsync() instead.');
  }

  // Synchronous initialization for backward compatibility
  prisma = createPrismaClient();
  repository = new PrismaRepository(prisma);
  return repository;
}

/**
 * Async version of getRepository() that prevents race conditions.
 * Recommended for new code to ensure thread-safe initialization.
 */
export async function getRepositoryAsync(): Promise<IRepository> {
  if (repository) {
    return repository;
  }

  // If already initializing, wait for existing promise
  if (initializationPromise) {
    return initializationPromise;
  }

  // Create initialization promise to prevent concurrent initialization
  initializationPromise = Promise.resolve().then(() => {
    if (!repository) {
      prisma = createPrismaClient();
      repository = new PrismaRepository(prisma);
    }
    initializationPromise = null;
    return repository;
  });

  return initializationPromise;
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
  initializationPromise = null;
  pgPool = null;
}

/**
 * Disconnect the repository/Prisma client and clean up resources.
 * Properly closes PostgreSQL connection pool if in use.
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

  // Explicitly close PostgreSQL connection pool if it exists
  if (pgPool) {
    await pgPool.end();
    pgPool = null;
  }

  initializationPromise = null;
}
