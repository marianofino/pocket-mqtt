import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type * as schema from '../db/schema.pg.js';
import type { DeviceRepository, Device, NewDevice, UpdateDevice } from './DeviceRepository.interface.js';
/**
 * PostgreSQL implementation of DeviceRepository.
 * Uses postgres.js driver with Drizzle ORM.
 */
export declare class PostgresDeviceRepository implements DeviceRepository {
    private db;
    constructor(db: PostgresJsDatabase<typeof schema>);
    create(device: NewDevice): Promise<Device>;
    findById(id: number): Promise<Device | undefined>;
    findByDeviceId(deviceId: string): Promise<Device | undefined>;
    findByToken(token: string): Promise<Device | undefined>;
    findMany(options?: {
        limit?: number;
        offset?: number;
    }): Promise<Device[]>;
    update(id: number, data: UpdateDevice): Promise<Device | undefined>;
    delete(id: number): Promise<void>;
    count(): Promise<number>;
    deleteAll(): Promise<void>;
}
//# sourceMappingURL=PostgresDeviceRepository.d.ts.map