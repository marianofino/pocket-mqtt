import { SQLiteMessageRepository } from './SQLiteMessageRepository.js';
import { PostgresMessageRepository } from './PostgresMessageRepository.js';
import { SQLiteDeviceRepository } from './SQLiteDeviceRepository.js';
import { PostgresDeviceRepository } from './PostgresDeviceRepository.js';
import { SQLiteTenantRepository } from './SQLiteTenantRepository.js';
import { PostgresTenantRepository } from './PostgresTenantRepository.js';
import { SQLiteUserRepository } from './SQLiteUserRepository.js';
import { PostgresUserRepository } from './PostgresUserRepository.js';
import { getDbClient, getDbAdapter } from '../database.js';
/**
 * Factory function to create the appropriate MessageRepository implementation
 * based on the current database adapter.
 *
 * This follows the Repository Pattern as per ARCHITECTURE.md:
 * - Abstract database calls for different storage engines
 * - Allow dynamic selection of SQLite or PostgreSQL
 */
export function createMessageRepository() {
    const adapter = getDbAdapter();
    const db = getDbClient();
    if (adapter === 'postgres') {
        return new PostgresMessageRepository(db);
    }
    return new SQLiteMessageRepository(db);
}
/**
 * Factory function to create the appropriate DeviceRepository implementation
 * based on the current database adapter.
 *
 * This follows the Repository Pattern as per ARCHITECTURE.md:
 * - Abstract database calls for different storage engines
 * - Allow dynamic selection of SQLite or PostgreSQL
 */
export function createDeviceRepository() {
    const adapter = getDbAdapter();
    const db = getDbClient();
    if (adapter === 'postgres') {
        return new PostgresDeviceRepository(db);
    }
    return new SQLiteDeviceRepository(db);
}
/**
 * Factory function to create the appropriate TenantRepository implementation
 * based on the current database adapter.
 *
 * This follows the Repository Pattern as per ARCHITECTURE.md:
 * - Abstract database calls for different storage engines
 * - Allow dynamic selection of SQLite or PostgreSQL
 */
export function createTenantRepository() {
    const adapter = getDbAdapter();
    const db = getDbClient();
    if (adapter === 'postgres') {
        return new PostgresTenantRepository(db);
    }
    return new SQLiteTenantRepository(db);
}
/**
 * Factory function to create the appropriate UserRepository implementation
 * based on the current database adapter.
 *
 * This follows the Repository Pattern as per ARCHITECTURE.md:
 * - Abstract database calls for different storage engines
 * - Allow dynamic selection of SQLite or PostgreSQL
 */
export function createUserRepository() {
    const adapter = getDbAdapter();
    const db = getDbClient();
    if (adapter === 'postgres') {
        return new PostgresUserRepository(db);
    }
    return new SQLiteUserRepository(db);
}
//# sourceMappingURL=repository.factory.js.map