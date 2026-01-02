import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { eq, and } from 'drizzle-orm';
import { count } from 'drizzle-orm';
import { user } from '../db/schema.js';
import type { UserRepository, User, NewUser } from './UserRepository.interface.js';

/**
 * SQLite implementation of UserRepository.
 * Uses Drizzle ORM with better-sqlite3 driver.
 */
export class SQLiteUserRepository implements UserRepository {
  constructor(private db: BetterSQLite3Database<any>) {}

  async create(data: NewUser): Promise<User> {
    const result = this.db.insert(user).values(data).returning().get();
    return result;
  }

  async findById(id: number): Promise<User | undefined> {
    const result = this.db.select().from(user).where(eq(user.id, id)).get();
    return result ?? undefined;
  }

  async findByTenantAndUsername(tenantId: number, username: string): Promise<User | undefined> {
    const result = this.db
      .select()
      .from(user)
      .where(and(eq(user.tenantId, tenantId), eq(user.username, username)))
      .get();
    return result ?? undefined;
  }

  async findByTenant(tenantId: number, options?: { limit?: number; offset?: number }): Promise<User[]> {
    const limit = options?.limit ?? 100;
    const offset = options?.offset ?? 0;
    
    return this.db
      .select()
      .from(user)
      .where(eq(user.tenantId, tenantId))
      .limit(limit)
      .offset(offset)
      .all();
  }

  async countByTenant(tenantId: number): Promise<number> {
    const result = this.db
      .select({ value: count() })
      .from(user)
      .where(eq(user.tenantId, tenantId))
      .get();
    return result?.value ?? 0;
  }

  async delete(id: number): Promise<void> {
    this.db.delete(user).where(eq(user.id, id)).run();
  }

  async deleteAll(): Promise<void> {
    this.db.delete(user).run();
  }
}
