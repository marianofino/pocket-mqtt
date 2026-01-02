import { eq, and, count } from 'drizzle-orm';
import { user } from '../db/schema.pg.js';
/**
 * PostgreSQL implementation of UserRepository.
 * Uses Drizzle ORM with postgres.js driver.
 */
export class PostgresUserRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    async create(data) {
        const result = await this.db.insert(user).values(data).returning();
        return result[0];
    }
    async findById(id) {
        const result = await this.db.select().from(user).where(eq(user.id, id));
        return result[0];
    }
    async findByTenantAndUsername(tenantId, username) {
        const result = await this.db
            .select()
            .from(user)
            .where(and(eq(user.tenantId, tenantId), eq(user.username, username)));
        return result[0];
    }
    async findByTenant(tenantId, options) {
        const limit = options?.limit ?? 100;
        const offset = options?.offset ?? 0;
        return await this.db
            .select()
            .from(user)
            .where(eq(user.tenantId, tenantId))
            .limit(limit)
            .offset(offset);
    }
    async countByTenant(tenantId) {
        const result = await this.db
            .select({ count: count() })
            .from(user)
            .where(eq(user.tenantId, tenantId));
        return result[0]?.count ?? 0;
    }
    async delete(id) {
        await this.db.delete(user).where(eq(user.id, id));
    }
    async deleteAll() {
        await this.db.delete(user);
    }
}
//# sourceMappingURL=PostgresUserRepository.js.map