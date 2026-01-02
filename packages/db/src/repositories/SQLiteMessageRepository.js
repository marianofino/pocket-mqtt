import { BaseMessageRepository } from './BaseMessageRepository.js';
import { telemetry } from '../db/schema.js';
/**
 * SQLite implementation of MessageRepository.
 * Uses Drizzle ORM with better-sqlite3 driver.
 */
export class SQLiteMessageRepository extends BaseMessageRepository {
    db;
    constructor(db) {
        super();
        this.db = db;
    }
    getDb() {
        return this.db;
    }
    getTelemetryTable() {
        return telemetry;
    }
}
//# sourceMappingURL=SQLiteMessageRepository.js.map