import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { eq } from 'drizzle-orm';
import { tenant } from '../db/schema.js';
import type { TenantRepository, Tenant, NewTenant } from './TenantRepository.interface.js';

/**
 * SQLite implementation of TenantRepository.
 * Uses Drizzle ORM with better-sqlite3 driver.
 */
export class SQLiteTenantRepository implements TenantRepository {
  constructor(private db: BetterSQLite3Database<any>) {}

  async create(data: NewTenant): Promise<Tenant> {
    const result = this.db.insert(tenant).values(data).returning().get();
    return result;
  }

  async findById(id: number): Promise<Tenant | undefined> {
    const result = this.db.select().from(tenant).where(eq(tenant.id, id)).get();
    return result ?? undefined;
  }

  async findByName(name: string): Promise<Tenant | undefined> {
    const result = this.db.select().from(tenant).where(eq(tenant.name, name)).get();
    return result ?? undefined;
  }

  async findByApiKey(apiKey: string): Promise<Tenant | undefined> {
    const result = this.db.select().from(tenant).where(eq(tenant.apiKey, apiKey)).get();
    return result ?? undefined;
  }

  async findMany(options?: { limit?: number; offset?: number }): Promise<Tenant[]> {
    const limit = options?.limit ?? 100;
    const offset = options?.offset ?? 0;
    
    return this.db.select().from(tenant).limit(limit).offset(offset).all();
  }

  async count(): Promise<number> {
    const result = this.db.select({ count: tenant.id }).from(tenant).all();
    return result.length;
  }

  async delete(id: number): Promise<void> {
    this.db.delete(tenant).where(eq(tenant.id, id)).run();
  }

  async deleteAll(): Promise<void> {
    this.db.delete(tenant).run();
  }
}
