import type { MessageRepository } from './MessageRepository.interface.js';
import { SQLiteMessageRepository } from './SQLiteMessageRepository.js';
import { PostgresMessageRepository } from './PostgresMessageRepository.js';
import { getDbClient, getDbAdapter } from '../database.js';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schemaSqlite from '../db/schema.js';
import * as schemaPg from '../db/schema.pg.js';

/**
 * Factory function to create the appropriate MessageRepository implementation
 * based on the current database adapter.
 * 
 * This follows the Repository Pattern as per ARCHITECTURE.md:
 * - Abstract database calls for different storage engines
 * - Allow dynamic selection of SQLite or PostgreSQL
 */
export function createMessageRepository(): MessageRepository {
  const adapter = getDbAdapter();
  const db = getDbClient();
  
  if (adapter === 'postgres') {
    return new PostgresMessageRepository(db as PostgresJsDatabase<typeof schemaPg>);
  }
  
  return new SQLiteMessageRepository(db as BetterSQLite3Database<typeof schemaSqlite>);
}
