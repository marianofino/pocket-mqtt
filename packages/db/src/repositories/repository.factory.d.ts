import type { MessageRepository } from './MessageRepository.interface.js';
import type { DeviceRepository } from './DeviceRepository.interface.js';
import type { TenantRepository } from './TenantRepository.interface.js';
import type { UserRepository } from './UserRepository.interface.js';
/**
 * Factory function to create the appropriate MessageRepository implementation
 * based on the current database adapter.
 *
 * This follows the Repository Pattern as per ARCHITECTURE.md:
 * - Abstract database calls for different storage engines
 * - Allow dynamic selection of SQLite or PostgreSQL
 */
export declare function createMessageRepository(): MessageRepository;
/**
 * Factory function to create the appropriate DeviceRepository implementation
 * based on the current database adapter.
 *
 * This follows the Repository Pattern as per ARCHITECTURE.md:
 * - Abstract database calls for different storage engines
 * - Allow dynamic selection of SQLite or PostgreSQL
 */
export declare function createDeviceRepository(): DeviceRepository;
/**
 * Factory function to create the appropriate TenantRepository implementation
 * based on the current database adapter.
 *
 * This follows the Repository Pattern as per ARCHITECTURE.md:
 * - Abstract database calls for different storage engines
 * - Allow dynamic selection of SQLite or PostgreSQL
 */
export declare function createTenantRepository(): TenantRepository;
/**
 * Factory function to create the appropriate UserRepository implementation
 * based on the current database adapter.
 *
 * This follows the Repository Pattern as per ARCHITECTURE.md:
 * - Abstract database calls for different storage engines
 * - Allow dynamic selection of SQLite or PostgreSQL
 */
export declare function createUserRepository(): UserRepository;
//# sourceMappingURL=repository.factory.d.ts.map