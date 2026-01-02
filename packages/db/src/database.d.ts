import 'dotenv/config';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schemaSqlite from './db/schema.js';
import * as schemaPg from './db/schema.pg.js';
type DbClient = BetterSQLite3Database<typeof schemaSqlite> | PostgresJsDatabase<typeof schemaPg>;
type DbAdapter = 'sqlite' | 'postgres';
/**
 * Get the database adapter from environment variable.
 * Defaults to 'sqlite' if not specified.
 */
export declare function getDbAdapter(): DbAdapter;
/**
 * Get or create a singleton Drizzle client instance.
 * Supports both SQLite and PostgreSQL based on DB_ADAPTER environment variable.
 *
 * For SQLite: Enables WAL mode for concurrent I/O as per ARCHITECTURE.md.
 * For PostgreSQL: Uses connection pooling via postgres.js.
 */
export declare function getDbClient(): DbClient;
/**
 * Reset the database client singleton (for testing).
 */
export declare function resetDbClient(): Promise<void>;
/**
 * Disconnect the database client and clean up resources.
 */
export declare function disconnectDb(): Promise<void>;
export {};
//# sourceMappingURL=database.d.ts.map