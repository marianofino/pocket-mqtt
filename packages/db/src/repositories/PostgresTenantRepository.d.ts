import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { TenantRepository, Tenant, NewTenant } from './TenantRepository.interface.js';
/**
 * PostgreSQL implementation of TenantRepository.
 * Uses Drizzle ORM with postgres.js driver.
 */
export declare class PostgresTenantRepository implements TenantRepository {
    private db;
    constructor(db: PostgresJsDatabase<any>);
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
//# sourceMappingURL=PostgresTenantRepository.d.ts.map