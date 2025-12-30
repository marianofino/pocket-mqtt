import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { BaseMessageRepository } from './BaseMessageRepository.js';
import { telemetry } from '../db/schema.pg.js';
import * as schema from '../db/schema.pg.js';

/**
 * PostgreSQL implementation of MessageRepository.
 * Uses Drizzle ORM with postgres.js driver.
 */
export class PostgresMessageRepository extends BaseMessageRepository {
  constructor(private db: PostgresJsDatabase<typeof schema>) {
    super();
  }

  protected getDb() {
    return this.db;
  }

  protected getTelemetryTable() {
    return telemetry;
  }
}
