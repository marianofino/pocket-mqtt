import { eq, and } from 'drizzle-orm';
import { count } from 'drizzle-orm';
import { user } from '../db/schema.js';
/**
 * SQLite implementation of UserRepository.
 * Uses Drizzle ORM with better-sqlite3 driver.
 */
export class SQLiteUserRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    async create(data) {
        const result = this.db.insert(user).values(data).returning().get();
        return result;
    }
    async findById(id) {
        const result = this.db.select().from(user).where(eq(user.id, id)).get();
        return result ?? undefined;
    }
    async findByTenantAndUsername(tenantId, username) {
        const result = this.db
            .select()
            .from(user)
            .where(and(eq(user.tenantId, tenantId), eq(user.username, username)))
            .get();
        return result ?? undefined;
    }
    async findByTenant(tenantId, options) {
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
    async countByTenant(tenantId) {
        const result = this.db
            .select({ value: count() })
            .from(user)
            .where(eq(user.tenantId, tenantId))
            .get();
        return result?.value ?? 0;
    }
    async delete(id) {
        this.db.delete(user).where(eq(user.id, id)).run();
    }
    async deleteAll() {
        this.db.delete(user).run();
    }
}
//# sourceMappingURL=SQLiteUserRepository.js.map