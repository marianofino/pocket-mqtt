import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { BaseMessageRepository } from './BaseMessageRepository.js';
import * as schema from '../db/schema.pg.js';
/**
 * PostgreSQL implementation of MessageRepository.
 * Uses Drizzle ORM with postgres.js driver.
 */
export declare class PostgresMessageRepository extends BaseMessageRepository {
    private db;
    constructor(db: PostgresJsDatabase<typeof schema>);
    protected getDb(): PostgresJsDatabase<typeof schema>;
    protected getTelemetryTable(): import("drizzle-orm/pg-core/table.js").PgTableWithColumns<{
        name: "Telemetry";
        schema: undefined;
        columns: {
            id: import("drizzle-orm/pg-core/index.js").PgColumn<{
                name: "id";
                tableName: "Telemetry";
                dataType: "number";
                columnType: "PgSerial";
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
            tenantId: import("drizzle-orm/pg-core/index.js").PgColumn<{
                name: "tenantId";
                tableName: "Telemetry";
                dataType: "number";
                columnType: "PgInteger";
                data: number;
                driverParam: string | number;
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
            topic: import("drizzle-orm/pg-core/index.js").PgColumn<{
                name: "topic";
                tableName: "Telemetry";
                dataType: "string";
                columnType: "PgText";
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
            }, {}, {}>;
            payload: import("drizzle-orm/pg-core/index.js").PgColumn<{
                name: "payload";
                tableName: "Telemetry";
                dataType: "string";
                columnType: "PgText";
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
            }, {}, {}>;
            timestamp: import("drizzle-orm/pg-core/index.js").PgColumn<{
                name: "timestamp";
                tableName: "Telemetry";
                dataType: "date";
                columnType: "PgTimestamp";
                data: Date;
                driverParam: string;
                notNull: true;
                hasDefault: true;
                isPrimaryKey: false;
                isAutoincrement: false;
                hasRuntimeDefault: false;
                enumValues: undefined;
                baseColumn: never;
                identity: undefined;
                generated: undefined;
            }, {}, {}>;
        };
        dialect: "pg";
    }>;
}
//# sourceMappingURL=PostgresMessageRepository.d.ts.map