import { BaseMessageRepository } from './BaseMessageRepository.js';
import { telemetry } from '../db/schema.pg.js';
/**
 * PostgreSQL implementation of MessageRepository.
 * Uses Drizzle ORM with postgres.js driver.
 */
export class PostgresMessageRepository extends BaseMessageRepository {
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
//# sourceMappingURL=PostgresMessageRepository.js.map