import 'dotenv/config';
import { PrismaClient } from './generated/prisma/index.js';
import { PrismaLibSql } from '@prisma/adapter-libsql';

let prisma: PrismaClient | null = null;

/**
 * Get or create a singleton Prisma client instance.
 * Enables WAL mode for SQLite for concurrent I/O as per ARCHITECTURE.md.
 */
export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    // Extract database path from environment variable
    const dbPath = process.env.DATABASE_URL?.replace('file:', '').split('?')[0] || './dev.db';
    
    // Create LibSQL adapter with local file URL
    const adapter = new PrismaLibSql({
      url: `file:${dbPath}`
    });
    
    // Initialize Prisma client with adapter
    prisma = new PrismaClient({ adapter });
    
    // Enable WAL mode for SQLite using Prisma
    prisma.$executeRawUnsafe('PRAGMA journal_mode=WAL;').catch((err) => {
      console.error('Failed to enable WAL mode:', err);
    });
  }
  
  return prisma;
}

/**
 * Reset the Prisma client singleton (for testing).
 */
export function resetPrismaClient(): void {
  prisma = null;
}

/**
 * Disconnect the Prisma client and clean up resources.
 */
export async function disconnectPrisma(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
}
