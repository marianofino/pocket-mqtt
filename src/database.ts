import 'dotenv/config';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from './db/schema.js';

let db: BetterSQLite3Database<typeof schema> | null = null;
let sqlite: Database.Database | null = null;

/**
 * Get or create a singleton Drizzle client instance.
 * Enables WAL mode for SQLite for concurrent I/O as per ARCHITECTURE.md.
 */
export function getDbClient(): BetterSQLite3Database<typeof schema> {
  if (!db) {
    // Extract database path from environment variable
    const dbPath = process.env.DATABASE_URL?.replace('file:', '').split('?')[0] || './dev.db';

    // Create SQLite connection
    sqlite = new Database(dbPath);

    // Enable WAL mode for SQLite for concurrent I/O
    try {
      sqlite.pragma('journal_mode = WAL');
    } catch (err: unknown) {
      console.error('Failed to enable WAL mode:', err);
      // Note: We log the error but don't fail fast here
      // WAL mode is an optimization, not a requirement
    }

    // Initialize Drizzle client with schema
    db = drizzle(sqlite, { schema });
  }
  return db;
}

/**
 * Reset the database client singleton (for testing).
 */
export function resetDbClient(): void {
  db = null;
  sqlite = null;
}

/**
 * Disconnect the database client and clean up resources.
 */
export async function disconnectDb(): Promise<void> {
  if (sqlite) {
    sqlite.close();
    sqlite = null;
    db = null;
  }
}
