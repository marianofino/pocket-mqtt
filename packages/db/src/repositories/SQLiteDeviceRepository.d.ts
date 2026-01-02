import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type * as schema from '../db/schema.js';
import type { DeviceRepository, Device, NewDevice, UpdateDevice } from './DeviceRepository.interface.js';
/**
 * SQLite implementation of DeviceRepository.
 * Uses better-sqlite3 driver with Drizzle ORM.
 */
export declare class SQLiteDeviceRepository implements DeviceRepository {
    private db;
    constructor(db: BetterSQLite3Database<typeof schema>);
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
//# sourceMappingURL=SQLiteDeviceRepository.d.ts.map