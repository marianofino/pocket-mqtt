import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, count } from 'drizzle-orm';
import { user } from '../db/schema.pg.js';
import type { UserRepository, User, NewUser } from './UserRepository.interface.js';

/**
 * PostgreSQL implementation of UserRepository.
 * Uses Drizzle ORM with postgres.js driver.
 */
export class PostgresUserRepository implements UserRepository {
  constructor(private db: PostgresJsDatabase<any>) {}

  async create(data: NewUser): Promise<User> {
    const result = await this.db.insert(user).values(data).returning();
    const created = result[0];

    if (!created) {
      throw new Error('Failed to insert user');
    }

    return created;
  }

  async findById(id: number): Promise<User | undefined> {
    const result = await this.db.select().from(user).where(eq(user.id, id));
    return result[0];
  }

  async findByTenantAndUsername(tenantId: number, username: string): Promise<User | undefined> {
    const result = await this.db
      .select()
      .from(user)
      .where(and(eq(user.tenantId, tenantId), eq(user.username, username)));
    return result[0];
  }

  async findByTenant(tenantId: number, options?: { limit?: number; offset?: number }): Promise<User[]> {
    const limit = options?.limit ?? 100;
    const offset = options?.offset ?? 0;
    
    return await this.db
      .select()
      .from(user)
      .where(eq(user.tenantId, tenantId))
      .limit(limit)
      .offset(offset);
  }

  async countByTenant(tenantId: number): Promise<number> {
    const result = await this.db
      .select({ count: count() })
      .from(user)
      .where(eq(user.tenantId, tenantId));
    return result[0]?.count ?? 0;
  }

  async delete(id: number): Promise<void> {
    await this.db.delete(user).where(eq(user.id, id));
  }

  async deleteAll(): Promise<void> {
    await this.db.delete(user);
  }
}
