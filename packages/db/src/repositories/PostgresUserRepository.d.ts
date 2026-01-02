import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { UserRepository, User, NewUser } from './UserRepository.interface.js';
/**
 * PostgreSQL implementation of UserRepository.
 * Uses Drizzle ORM with postgres.js driver.
 */
export declare class PostgresUserRepository implements UserRepository {
    private db;
    constructor(db: PostgresJsDatabase<any>);
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
//# sourceMappingURL=PostgresUserRepository.d.ts.map