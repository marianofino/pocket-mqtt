/**
 * @pocket/db - Database schemas, repositories, and connection for PocketMQTT
 */

// Export database connection
export * from './database.js';

// Export schemas
export * from './db/schema.js';
export * from './db/schema.pg.js';

// Export repository interfaces
export * from './repositories/MessageRepository.interface.js';
export * from './repositories/DeviceRepository.interface.js';
export * from './repositories/TenantRepository.interface.js';
export * from './repositories/UserRepository.interface.js';

// Export repository implementations
export * from './repositories/BaseMessageRepository.js';
export * from './repositories/SQLiteMessageRepository.js';
export * from './repositories/PostgresMessageRepository.js';
export * from './repositories/SQLiteDeviceRepository.js';
export * from './repositories/PostgresDeviceRepository.js';
export * from './repositories/SQLiteTenantRepository.js';
export * from './repositories/PostgresTenantRepository.js';
export * from './repositories/SQLiteUserRepository.js';
export * from './repositories/PostgresUserRepository.js';

// Export repository factory
export * from './repositories/repository.factory.js';
