import type { MessageRepository, Telemetry, NewTelemetry } from './MessageRepository.interface.js';
/**
 * Base repository implementation with shared logic for both SQLite and PostgreSQL.
 * Eliminates code duplication by providing common query patterns.
 */
export declare abstract class BaseMessageRepository implements MessageRepository {
    protected abstract getTelemetryTable(): any;
    protected abstract getDb(): any;
    insertBatch(messages: NewTelemetry[]): Promise<void>;
    findMany(options: {
        topic?: string;
        limit?: number;
        offset?: number;
    }): Promise<Telemetry[]>;
    count(topic?: string): Promise<number>;
    deleteAll(): Promise<void>;
}
//# sourceMappingURL=BaseMessageRepository.d.ts.map