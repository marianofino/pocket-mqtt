import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { BaseMessageRepository } from './BaseMessageRepository.js';
import { telemetry } from '../db/schema.js';
import * as schema from '../db/schema.js';

/**
 * SQLite implementation of MessageRepository.
 * Uses Drizzle ORM with better-sqlite3 driver.
 */
export class SQLiteMessageRepository extends BaseMessageRepository {
  constructor(private db: BetterSQLite3Database<typeof schema>) {
    super();
  }

  protected getDb() {
    return this.db;
  }

  protected getTelemetryTable() {
    return telemetry;
  }
}
