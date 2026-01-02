import 'dotenv/config';
import { drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3';
import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js';
import Database from 'better-sqlite3';
import postgres from 'postgres';
import * as schemaSqlite from './db/schema.js';
import * as schemaPg from './db/schema.pg.js';
let db = null;
let sqlite = null;
let pgClient = null;
let currentAdapter = null;
/**
 * Get the database adapter from environment variable.
 * Defaults to 'sqlite' if not specified.
 */
export function getDbAdapter() {
    const adapter = process.env.DB_ADAPTER?.toLowerCase();
    return adapter === 'postgres' || adapter === 'postgresql' ? 'postgres' : 'sqlite';
}
/**
 * Get or create a singleton Drizzle client instance.
 * Supports both SQLite and PostgreSQL based on DB_ADAPTER environment variable.
 *
 * For SQLite: Enables WAL mode for concurrent I/O as per ARCHITECTURE.md.
 * For PostgreSQL: Uses connection pooling via postgres.js.
 */
export function getDbClient() {
    const adapter = getDbAdapter();
    // If client exists and adapter hasn't changed, return it
    if (db && currentAdapter === adapter) {
        return db;
    }
    // Clean up old client if adapter changed
    if (db && currentAdapter !== adapter) {
        console.warn('Database adapter changed at runtime. This may cause connection leaks. Consider restarting the application.');
        if (sqlite) {
            sqlite.close();
            sqlite = null;
        }
        if (pgClient) {
            // Note: Cannot await in sync function. Connection cleanup happens on next event loop.
            // This is an edge case - adapter shouldn't change at runtime in production.
            void pgClient.end({ timeout: 5 });
            pgClient = null;
        }
        db = null;
    }
    currentAdapter = adapter;
    if (adapter === 'postgres') {
        // PostgreSQL connection
        const connectionString = process.env.DATABASE_URL || 'postgresql://localhost:5432/pocket_mqtt';
        pgClient = postgres(connectionString);
        db = drizzlePostgres(pgClient, { schema: schemaPg });
    }
    else {
        // SQLite connection (default)
        const dbPath = process.env.DATABASE_URL?.replace('file:', '').split('?')[0] || './dev.db';
        sqlite = new Database(dbPath);
        // Enable WAL mode for SQLite for concurrent I/O
        try {
            sqlite.pragma('journal_mode = WAL');
        }
        catch (err) {
            console.error('Failed to enable WAL mode:', err);
            // Note: We log the error but don't fail fast here
            // WAL mode is an optimization, not a requirement
        }
        db = drizzleSqlite(sqlite, { schema: schemaSqlite });
    }
    return db;
}
/**
 * Reset the database client singleton (for testing).
 */
export async function resetDbClient() {
    if (sqlite) {
        sqlite.close();
        sqlite = null;
    }
    if (pgClient) {
        await pgClient.end({ timeout: 5 });
        pgClient = null;
    }
    db = null;
    currentAdapter = null;
}
/**
 * Disconnect the database client and clean up resources.
 */
export async function disconnectDb() {
    if (sqlite) {
        sqlite.close();
        sqlite = null;
    }
    if (pgClient) {
        await pgClient.end({ timeout: 5 });
        pgClient = null;
    }
    db = null;
    currentAdapter = null;
}
//# sourceMappingURL=database.js.map