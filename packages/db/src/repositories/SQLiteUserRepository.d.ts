import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type { UserRepository, User, NewUser } from './UserRepository.interface.js';
/**
 * SQLite implementation of UserRepository.
 * Uses Drizzle ORM with better-sqlite3 driver.
 */
export declare class SQLiteUserRepository implements UserRepository {
    private db;
    constructor(db: BetterSQLite3Database<any>);
    create(data: NewUser): Promise<User>;
    findById(id: number): Promise<User | undefined>;
    findByTenantAndUsername(tenantId: number, username: string): Promise<User | undefined>;
    findByTenant(tenantId: number, options?: {
        limit?: number;
        offset?: number;
    }): Promise<User[]>;
    countByTenant(tenantId: number): Promise<number>;
    delete(id: number): Promise<void>;
    deleteAll(): Promise<void>;
}
//# sourceMappingURL=SQLiteUserRepository.d.ts.map