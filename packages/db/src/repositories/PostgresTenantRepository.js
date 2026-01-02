import { eq, count } from 'drizzle-orm';
import { tenant } from '../db/schema.pg.js';
/**
 * PostgreSQL implementation of TenantRepository.
 * Uses Drizzle ORM with postgres.js driver.
 */
export class PostgresTenantRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    async create(data) {
        const result = await this.db.insert(tenant).values(data).returning();
        return result[0];
    }
    async findById(id) {
        const result = await this.db.select().from(tenant).where(eq(tenant.id, id));
        return result[0];
    }
    async findByName(name) {
        const result = await this.db.select().from(tenant).where(eq(tenant.name, name));
        return result[0];
    }
    async findByApiKey(apiKey) {
        const result = await this.db.select().from(tenant).where(eq(tenant.apiKey, apiKey));
        return result[0];
    }
    async findMany(options) {
        const limit = options?.limit ?? 100;
        const offset = options?.offset ?? 0;
        return await this.db.select().from(tenant).limit(limit).offset(offset);
    }
    async count() {
        const result = await this.db.select({ count: count() }).from(tenant);
        return result[0]?.count ?? 0;
    }
    async delete(id) {
        await this.db.delete(tenant).where(eq(tenant.id, id));
    }
    async deleteAll() {
        await this.db.delete(tenant);
    }
}
//# sourceMappingURL=PostgresTenantRepository.js.map