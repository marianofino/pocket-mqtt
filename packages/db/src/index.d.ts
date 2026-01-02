/**
 * @pocket/db - Database schemas, repositories, and connection for PocketMQTT
 */
export * from './database.js';
export * from './db/schema.js';
export * as schemaPg from './db/schema.pg.js';
export type { MessageRepository } from './repositories/MessageRepository.interface.js';
export type { DeviceRepository, Device, NewDevice, UpdateDevice } from './repositories/DeviceRepository.interface.js';
export type { TenantRepository, Tenant, NewTenant } from './repositories/TenantRepository.interface.js';
export type { UserRepository, User, NewUser } from './repositories/UserRepository.interface.js';
export * from './repositories/BaseMessageRepository.js';
export * from './repositories/SQLiteMessageRepository.js';
export * from './repositories/PostgresMessageRepository.js';
export * from './repositories/SQLiteDeviceRepository.js';
export * from './repositories/PostgresDeviceRepository.js';
export * from './repositories/SQLiteTenantRepository.js';
export * from './repositories/PostgresTenantRepository.js';
export * from './repositories/SQLiteUserRepository.js';
export * from './repositories/PostgresUserRepository.js';
export * from './repositories/repository.factory.js';
//# sourceMappingURL=index.d.ts.map