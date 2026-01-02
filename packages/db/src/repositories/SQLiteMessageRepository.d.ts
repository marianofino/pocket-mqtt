import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { BaseMessageRepository } from './BaseMessageRepository.js';
import * as schema from '../db/schema.js';
/**
 * SQLite implementation of MessageRepository.
 * Uses Drizzle ORM with better-sqlite3 driver.
 */
export declare class SQLiteMessageRepository extends BaseMessageRepository {
    private db;
    constructor(db: BetterSQLite3Database<typeof schema>);
    protected getDb(): BetterSQLite3Database<typeof schema>;
    protected getTelemetryTable(): import("drizzle-orm/sqlite-core/table.js").SQLiteTableWithColumns<{
        name: "Telemetry";
        schema: undefined;
        columns: {
            id: import("drizzle-orm/sqlite-core/index.js").SQLiteColumn<{
                name: "id";
                tableName: "Telemetry";
                dataType: "number";
                columnType: "SQLiteInteger";
                data: number;
                driverParam: number;
                notNull: true;
                hasDefault: true;
                isPrimaryKey: true;
                isAutoincrement: false;
                hasRuntimeDefault: false;
                enumValues: undefined;
                baseColumn: never;
                identity: undefined;
                generated: undefined;
            }, {}, {}>;
            tenantId: import("drizzle-orm/sqlite-core/index.js").SQLiteColumn<{
                name: "tenantId";
                tableName: "Telemetry";
                dataType: "number";
                columnType: "SQLiteInteger";
                data: number;
                driverParam: number;
                notNull: true;
                hasDefault: false;
                isPrimaryKey: false;
                isAutoincrement: false;
                hasRuntimeDefault: false;
                enumValues: undefined;
                baseColumn: never;
                identity: undefined;
                generated: undefined;
            }, {}, {}>;
            topic: import("drizzle-orm/sqlite-core/index.js").SQLiteColumn<{
                name: "topic";
                tableName: "Telemetry";
                dataType: "string";
                columnType: "SQLiteText";
                data: string;
                driverParam: string;
                notNull: true;
                hasDefault: false;
                isPrimaryKey: false;
                isAutoincrement: false;
                hasRuntimeDefault: false;
                enumValues: [string, ...string[]];
                baseColumn: never;
                identity: undefined;
                generated: undefined;
            }, {}, {
                length: number | undefined;
            }>;
            payload: import("drizzle-orm/sqlite-core/index.js").SQLiteColumn<{
                name: "payload";
                tableName: "Telemetry";
                dataType: "string";
                columnType: "SQLiteText";
                data: string;
                driverParam: string;
                notNull: true;
                hasDefault: false;
                isPrimaryKey: false;
                isAutoincrement: false;
                hasRuntimeDefault: false;
                enumValues: [string, ...string[]];
                baseColumn: never;
                identity: undefined;
                generated: undefined;
            }, {}, {
                length: number | undefined;
            }>;
            timestamp: import("drizzle-orm/sqlite-core/index.js").SQLiteColumn<{
                name: "timestamp";
                tableName: "Telemetry";
                dataType: "date";
                columnType: "SQLiteTimestamp";
                data: Date;
                driverParam: number;
                notNull: true;
                hasDefault: true;
                isPrimaryKey: false;
                isAutoincrement: false;
                hasRuntimeDefault: true;
                enumValues: undefined;
                baseColumn: never;
                identity: undefined;
                generated: undefined;
            }, {}, {}>;
        };
        dialect: "sqlite";
    }>;
}
//# sourceMappingURL=SQLiteMessageRepository.d.ts.map