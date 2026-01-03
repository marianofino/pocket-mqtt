import { describe, expect, it } from 'vitest';
import { PostgresDeviceRepository } from './PostgresDeviceRepository.js';
import { SQLiteDeviceRepository } from './SQLiteDeviceRepository.js';
import { PostgresTenantRepository } from './PostgresTenantRepository.js';
import { PostgresUserRepository } from './PostgresUserRepository.js';
import type { Device, NewDevice } from './DeviceRepository.interface.js';
import type { Tenant, NewTenant } from './TenantRepository.interface.js';
import type { User, NewUser } from './UserRepository.interface.js';

const makeInsertDb = <TRow>(rows: TRow[]) => ({
  insert: (_table?: unknown) => ({
    values: (_data?: unknown) => ({
      returning: async () => rows,
    }),
  }),
});

const deviceRow: Device = {
  id: 1,
  tenantId: 10,
  deviceId: 'device-1',
  tokenHash: 'hash',
  name: 'Device 1',
  labels: null,
  notes: null,
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  expiresAt: null,
};

const newDevice: NewDevice = {
  tenantId: deviceRow.tenantId,
  deviceId: deviceRow.deviceId,
  tokenHash: deviceRow.tokenHash,
  name: deviceRow.name,
  labels: deviceRow.labels,
  notes: deviceRow.notes ?? undefined,
  expiresAt: deviceRow.expiresAt ?? undefined,
};

const tenantRow: Tenant = {
  id: 1,
  name: 'acme',
  apiKey: 'apikey',
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
};

const newTenant: NewTenant = {
  name: tenantRow.name,
  apiKey: tenantRow.apiKey,
};

const userRow: User = {
  id: 1,
  tenantId: 1,
  username: 'alice',
  passwordHash: 'hash',
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
};

const newUser: NewUser = {
  tenantId: userRow.tenantId,
  username: userRow.username,
  passwordHash: userRow.passwordHash,
};

describe('repository create guards', () => {
  it('returns created device (postgres) and guards empty result', async () => {
    const okRepo = new PostgresDeviceRepository(makeInsertDb([deviceRow]) as any);
    await expect(okRepo.create(newDevice)).resolves.toEqual(deviceRow);

    const emptyRepo = new PostgresDeviceRepository(makeInsertDb<Device>([]) as any);
    await expect(emptyRepo.create(newDevice)).rejects.toThrow();
  });

  it('returns created device (sqlite) and guards empty result', async () => {
    const okRepo = new SQLiteDeviceRepository(makeInsertDb([deviceRow]) as any);
    await expect(okRepo.create(newDevice)).resolves.toEqual(deviceRow);

    const emptyRepo = new SQLiteDeviceRepository(makeInsertDb<Device>([]) as any);
    await expect(emptyRepo.create(newDevice)).rejects.toThrow();
  });

  it('returns created tenant and guards empty result', async () => {
    const okRepo = new PostgresTenantRepository(makeInsertDb([tenantRow]) as any);
    await expect(okRepo.create(newTenant)).resolves.toEqual(tenantRow);

    const emptyRepo = new PostgresTenantRepository(makeInsertDb<Tenant>([]) as any);
    await expect(emptyRepo.create(newTenant)).rejects.toThrow();
  });

  it('returns created user and guards empty result', async () => {
    const okRepo = new PostgresUserRepository(makeInsertDb([userRow]) as any);
    await expect(okRepo.create(newUser)).resolves.toEqual(userRow);

    const emptyRepo = new PostgresUserRepository(makeInsertDb<User>([]) as any);
    await expect(emptyRepo.create(newUser)).rejects.toThrow();
  });
});