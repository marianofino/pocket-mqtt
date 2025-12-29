import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { MessageRepository } from './MessageRepository.interface.js';
import type { Telemetry, NewTelemetry } from '../db/schema.pg.js';
import { telemetry } from '../db/schema.pg.js';
import { eq, desc, count as drizzleCount } from 'drizzle-orm';
import * as schema from '../db/schema.pg.js';

/**
 * PostgreSQL implementation of MessageRepository.
 * Uses Drizzle ORM with postgres.js driver.
 */
export class PostgresMessageRepository implements MessageRepository {
  constructor(private db: PostgresJsDatabase<typeof schema>) {}

  async insertBatch(messages: NewTelemetry[]): Promise<void> {
    if (messages.length === 0) {
      return;
    }
    await this.db.insert(telemetry).values(messages);
  }

  async findMany(options: {
    topic?: string;
    limit?: number;
    offset?: number;
  }): Promise<Telemetry[]> {
    const { topic, limit = 100, offset = 0 } = options;

    if (topic) {
      return await this.db
        .select()
        .from(telemetry)
        .where(eq(telemetry.topic, topic))
        .orderBy(desc(telemetry.timestamp))
        .limit(limit)
        .offset(offset);
    }

    return await this.db
      .select()
      .from(telemetry)
      .orderBy(desc(telemetry.timestamp))
      .limit(limit)
      .offset(offset);
  }

  async count(topic?: string): Promise<number> {
    if (topic) {
      const result = await this.db
        .select({ count: drizzleCount() })
        .from(telemetry)
        .where(eq(telemetry.topic, topic));
      return result[0]?.count || 0;
    }

    const result = await this.db
      .select({ count: drizzleCount() })
      .from(telemetry);
    return result[0]?.count || 0;
  }

  async deleteAll(): Promise<void> {
    await this.db.delete(telemetry);
  }
}
