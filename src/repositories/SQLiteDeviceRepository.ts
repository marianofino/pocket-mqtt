import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { eq, count as drizzleCount } from 'drizzle-orm';
import type * as schema from '../db/schema.js';
import { deviceToken } from '../db/schema.js';
import type { DeviceRepository, Device, NewDevice, UpdateDevice } from './DeviceRepository.interface.js';

/**
 * SQLite implementation of DeviceRepository.
 * Uses better-sqlite3 driver with Drizzle ORM.
 */
export class SQLiteDeviceRepository implements DeviceRepository {
  constructor(private db: BetterSQLite3Database<typeof schema>) {}

  async create(device: NewDevice): Promise<Device> {
    const result = await this.db.insert(deviceToken).values(device).returning();
    return result[0];
  }

  async findById(id: number): Promise<Device | undefined> {
    const results = await this.db.select()
      .from(deviceToken)
      .where(eq(deviceToken.id, id))
      .limit(1);
    return results[0];
  }

  async findByDeviceId(deviceId: string): Promise<Device | undefined> {
    const results = await this.db.select()
      .from(deviceToken)
      .where(eq(deviceToken.deviceId, deviceId))
      .limit(1);
    return results[0];
  }

  async findByToken(token: string): Promise<Device | undefined> {
    const results = await this.db.select()
      .from(deviceToken)
      .where(eq(deviceToken.token, token))
      .limit(1);
    return results[0];
  }

  async findMany(options?: { limit?: number; offset?: number }): Promise<Device[]> {
    const limit = options?.limit ?? 100;
    const offset = options?.offset ?? 0;
    
    return await this.db.select()
      .from(deviceToken)
      .limit(limit)
      .offset(offset);
  }

  async update(id: number, data: UpdateDevice): Promise<Device | undefined> {
    const result = await this.db.update(deviceToken)
      .set(data)
      .where(eq(deviceToken.id, id))
      .returning();
    return result[0];
  }

  async delete(id: number): Promise<void> {
    await this.db.delete(deviceToken)
      .where(eq(deviceToken.id, id));
  }

  async count(): Promise<number> {
    const result = await this.db.select({ count: drizzleCount() })
      .from(deviceToken);
    return result[0]?.count || 0;
  }

  async deleteAll(): Promise<void> {
    await this.db.delete(deviceToken);
  }
}
