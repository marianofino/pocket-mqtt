import type { MessageRepository, Telemetry, NewTelemetry } from './MessageRepository.interface.js';
import { eq, desc, count as drizzleCount } from 'drizzle-orm';

/**
 * Base repository implementation with shared logic for both SQLite and PostgreSQL.
 * Eliminates code duplication by providing common query patterns.
 */
export abstract class BaseMessageRepository implements MessageRepository {
  protected abstract getTelemetryTable(): any;
  protected abstract getDb(): any;

  async insertBatch(messages: NewTelemetry[]): Promise<void> {
    if (messages.length === 0) {
      return;
    }
    const table = this.getTelemetryTable();
    await this.getDb().insert(table).values(messages);
  }

  async findMany(options: {
    topic?: string;
    limit?: number;
    offset?: number;
  }): Promise<Telemetry[]> {
    const { topic, limit = 100, offset = 0 } = options;
    const table = this.getTelemetryTable();
    const db = this.getDb();

    let query = db
      .select()
      .from(table)
      .orderBy(desc(table.timestamp))
      .limit(limit)
      .offset(offset);

    if (topic) {
      query = db
        .select()
        .from(table)
        .where(eq(table.topic, topic))
        .orderBy(desc(table.timestamp))
        .limit(limit)
        .offset(offset);
    }

    return await query as Telemetry[];
  }

  async count(topic?: string): Promise<number> {
    const table = this.getTelemetryTable();
    const db = this.getDb();

    let query = db.select({ count: drizzleCount() }).from(table);

    if (topic) {
      query = query.where(eq(table.topic, topic));
    }

    const result = await query;
    return result[0]?.count || 0;
  }

  async deleteAll(): Promise<void> {
    const table = this.getTelemetryTable();
    await this.getDb().delete(table);
  }
}
