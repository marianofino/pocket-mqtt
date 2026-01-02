import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type { TenantRepository, Tenant, NewTenant } from './TenantRepository.interface.js';
/**
 * SQLite implementation of TenantRepository.
 * Uses Drizzle ORM with better-sqlite3 driver.
 */
export declare class SQLiteTenantRepository implements TenantRepository {
    private db;
    constructor(db: BetterSQLite3Database<any>);
    create(data: NewTenant): Promise<Tenant>;
    findById(id: number): Promise<Tenant | undefined>;
    findByName(name: string): Promise<Tenant | undefined>;
    findByApiKey(apiKey: string): Promise<Tenant | undefined>;
    findMany(options?: {
        limit?: number;
        offset?: number;
    }): Promise<Tenant[]>;
    count(): Promise<number>;
    delete(id: number): Promise<void>;
    deleteAll(): Promise<void>;
}
//# sourceMappingURL=SQLiteTenantRepository.d.ts.map