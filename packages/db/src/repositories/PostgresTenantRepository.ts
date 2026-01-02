import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, count } from 'drizzle-orm';
import { tenant } from '../db/schema.pg.js';
import type { TenantRepository, Tenant, NewTenant } from './TenantRepository.interface.js';

/**
 * PostgreSQL implementation of TenantRepository.
 * Uses Drizzle ORM with postgres.js driver.
 */
export class PostgresTenantRepository implements TenantRepository {
  constructor(private db: PostgresJsDatabase<any>) {}

  async create(data: NewTenant): Promise<Tenant> {
    const result = await this.db.insert(tenant).values(data).returning();
    return result[0];
  }

  async findById(id: number): Promise<Tenant | undefined> {
    const result = await this.db.select().from(tenant).where(eq(tenant.id, id));
    return result[0];
  }

  async findByName(name: string): Promise<Tenant | undefined> {
    const result = await this.db.select().from(tenant).where(eq(tenant.name, name));
    return result[0];
  }

  async findByApiKey(apiKey: string): Promise<Tenant | undefined> {
    const result = await this.db.select().from(tenant).where(eq(tenant.apiKey, apiKey));
    return result[0];
  }

  async findMany(options?: { limit?: number; offset?: number }): Promise<Tenant[]> {
    const limit = options?.limit ?? 100;
    const offset = options?.offset ?? 0;
    
    return await this.db.select().from(tenant).limit(limit).offset(offset);
  }

  async count(): Promise<number> {
    const result = await this.db.select({ count: count() }).from(tenant);
    return result[0]?.count ?? 0;
  }

  async delete(id: number): Promise<void> {
    await this.db.delete(tenant).where(eq(tenant.id, id));
  }

  async deleteAll(): Promise<void> {
    await this.db.delete(tenant);
  }
}
