import { eq } from 'drizzle-orm';
import { count } from 'drizzle-orm';
import { tenant } from '../db/schema.js';
/**
 * SQLite implementation of TenantRepository.
 * Uses Drizzle ORM with better-sqlite3 driver.
 */
export class SQLiteTenantRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    async create(data) {
        const result = this.db.insert(tenant).values(data).returning().get();
        return result;
    }
    async findById(id) {
        const result = this.db.select().from(tenant).where(eq(tenant.id, id)).get();
        return result ?? undefined;
    }
    async findByName(name) {
        const result = this.db.select().from(tenant).where(eq(tenant.name, name)).get();
        return result ?? undefined;
    }
    async findByApiKey(apiKey) {
        const result = this.db.select().from(tenant).where(eq(tenant.apiKey, apiKey)).get();
        return result ?? undefined;
    }
    async findMany(options) {
        const limit = options?.limit ?? 100;
        const offset = options?.offset ?? 0;
        return this.db.select().from(tenant).limit(limit).offset(offset).all();
    }
    async count() {
        const result = this.db.select({ value: count() }).from(tenant).get();
        return result?.value ?? 0;
    }
    async delete(id) {
        this.db.delete(tenant).where(eq(tenant.id, id)).run();
    }
    async deleteAll() {
        this.db.delete(tenant).run();
    }
}
//# sourceMappingURL=SQLiteTenantRepository.js.map