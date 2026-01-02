import { eq, count as drizzleCount } from 'drizzle-orm';
import { deviceToken } from '../db/schema.js';
/**
 * SQLite implementation of DeviceRepository.
 * Uses better-sqlite3 driver with Drizzle ORM.
 */
export class SQLiteDeviceRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    async create(device) {
        const result = await this.db.insert(deviceToken).values(device).returning();
        return result[0];
    }
    async findById(id) {
        const results = await this.db.select()
            .from(deviceToken)
            .where(eq(deviceToken.id, id))
            .limit(1);
        return results[0];
    }
    async findByDeviceId(deviceId) {
        const results = await this.db.select()
            .from(deviceToken)
            .where(eq(deviceToken.deviceId, deviceId))
            .limit(1);
        return results[0];
    }
    async findByToken(token) {
        const results = await this.db.select()
            .from(deviceToken)
            .where(eq(deviceToken.token, token))
            .limit(1);
        return results[0];
    }
    async findMany(options) {
        const limit = options?.limit ?? 100;
        const offset = options?.offset ?? 0;
        return await this.db.select()
            .from(deviceToken)
            .orderBy(deviceToken.name)
            .limit(limit)
            .offset(offset);
    }
    async update(id, data) {
        const result = await this.db.update(deviceToken)
            .set(data)
            .where(eq(deviceToken.id, id))
            .returning();
        return result[0];
    }
    async delete(id) {
        await this.db.delete(deviceToken)
            .where(eq(deviceToken.id, id));
    }
    async count() {
        const result = await this.db.select({ count: drizzleCount() })
            .from(deviceToken);
        return result[0]?.count || 0;
    }
    async deleteAll() {
        await this.db.delete(deviceToken);
    }
}
//# sourceMappingURL=SQLiteDeviceRepository.js.map