import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { getRepository, disconnectPrisma, getDatabaseAdapter } from '../database.js';
import type { IRepository } from '../repository/interfaces.js';

describe('Repository Pattern', () => {
  let repository: IRepository;

  beforeAll(async () => {
    repository = getRepository();
  });

  beforeEach(async () => {
    // Clean database before each test
    await repository.telemetry.deleteAll();
    await repository.deviceToken.deleteAll();
  });

  afterEach(async () => {
    // Clean up after each test
    await repository.telemetry.deleteAll();
    await repository.deviceToken.deleteAll();
  });

  afterAll(async () => {
    await disconnectPrisma();
  });

  describe('Database Adapter Selection', () => {
    it('should return the correct database adapter from environment', () => {
      const adapter = getDatabaseAdapter();
      // Default should be 'sqlite' unless DATABASE_ADAPTER env var is set
      expect(adapter).toBe('sqlite');
    });
  });

  describe('TelemetryRepository', () => {
    it('should create multiple telemetry records', async () => {
      const data = [
        { topic: 'test/topic1', payload: 'payload1', timestamp: new Date() },
        { topic: 'test/topic2', payload: 'payload2', timestamp: new Date() },
        { topic: 'test/topic3', payload: 'payload3', timestamp: new Date() },
      ];

      await repository.telemetry.createMany(data);

      const records = await repository.telemetry.findMany({});
      expect(records).toHaveLength(3);
    });

    it('should find telemetry records with pagination', async () => {
      // Create 10 records
      const data = Array.from({ length: 10 }, (_, i) => ({
        topic: `test/topic${i}`,
        payload: `payload${i}`,
        timestamp: new Date(),
      }));

      await repository.telemetry.createMany(data);

      // Get first 5 records
      const firstPage = await repository.telemetry.findMany({ limit: 5, offset: 0 });
      expect(firstPage).toHaveLength(5);

      // Get next 5 records
      const secondPage = await repository.telemetry.findMany({ limit: 5, offset: 5 });
      expect(secondPage).toHaveLength(5);
    });

    it('should filter telemetry records by topic', async () => {
      const data = [
        { topic: 'sensor/temperature', payload: 'payload1', timestamp: new Date() },
        { topic: 'sensor/humidity', payload: 'payload2', timestamp: new Date() },
        { topic: 'sensor/temperature', payload: 'payload3', timestamp: new Date() },
      ];

      await repository.telemetry.createMany(data);

      const records = await repository.telemetry.findMany({ topic: 'sensor/temperature' });
      expect(records).toHaveLength(2);
      expect(records.every(r => r.topic === 'sensor/temperature')).toBe(true);
    });

    it('should count telemetry records', async () => {
      const data = [
        { topic: 'test/topic1', payload: 'payload1', timestamp: new Date() },
        { topic: 'test/topic2', payload: 'payload2', timestamp: new Date() },
        { topic: 'test/topic1', payload: 'payload3', timestamp: new Date() },
      ];

      await repository.telemetry.createMany(data);

      const totalCount = await repository.telemetry.count({});
      expect(totalCount).toBe(3);

      const topicCount = await repository.telemetry.count({ topic: 'test/topic1' });
      expect(topicCount).toBe(2);
    });

    it('should order telemetry records by timestamp descending', async () => {
      const now = Date.now();
      const data = [
        { topic: 'test/topic1', payload: 'payload1', timestamp: new Date(now - 2000) },
        { topic: 'test/topic2', payload: 'payload2', timestamp: new Date(now - 1000) },
        { topic: 'test/topic3', payload: 'payload3', timestamp: new Date(now) },
      ];

      await repository.telemetry.createMany(data);

      const records = await repository.telemetry.findMany({
        orderBy: 'timestamp',
        orderDirection: 'desc',
      });

      expect(records).toHaveLength(3);
      expect(records[0].topic).toBe('test/topic3');
      expect(records[1].topic).toBe('test/topic2');
      expect(records[2].topic).toBe('test/topic1');
    });

    it('should delete all telemetry records', async () => {
      const data = [
        { topic: 'test/topic1', payload: 'payload1', timestamp: new Date() },
        { topic: 'test/topic2', payload: 'payload2', timestamp: new Date() },
      ];

      await repository.telemetry.createMany(data);
      let count = await repository.telemetry.count({});
      expect(count).toBe(2);

      await repository.telemetry.deleteAll();
      count = await repository.telemetry.count({});
      expect(count).toBe(0);
    });
  });

  describe('DeviceTokenRepository', () => {
    it('should create a device token', async () => {
      const tokenData = {
        deviceId: 'device123',
        token: 'token123',
        expiresAt: new Date(Date.now() + 86400000), // 1 day from now
      };

      const created = await repository.deviceToken.create(tokenData);
      expect(created.deviceId).toBe('device123');
      expect(created.token).toBe('token123');
      expect(created.expiresAt).toBeInstanceOf(Date);
      expect(created.createdAt).toBeInstanceOf(Date);
    });

    it('should find a device token by token string', async () => {
      const tokenData = {
        deviceId: 'device456',
        token: 'token456',
      };

      await repository.deviceToken.create(tokenData);

      const found = await repository.deviceToken.findByToken('token456');
      expect(found).not.toBeNull();
      expect(found?.deviceId).toBe('device456');
      expect(found?.token).toBe('token456');
    });

    it('should return null when token is not found', async () => {
      const found = await repository.deviceToken.findByToken('nonexistent');
      expect(found).toBeNull();
    });

    it('should create a device token without expiration', async () => {
      const tokenData = {
        deviceId: 'device789',
        token: 'token789',
      };

      const created = await repository.deviceToken.create(tokenData);
      expect(created.deviceId).toBe('device789');
      expect(created.expiresAt).toBeNull();
    });

    it('should delete all device tokens', async () => {
      await repository.deviceToken.create({
        deviceId: 'device1',
        token: 'token1',
      });
      await repository.deviceToken.create({
        deviceId: 'device2',
        token: 'token2',
      });

      await repository.deviceToken.deleteAll();

      const found = await repository.deviceToken.findByToken('token1');
      expect(found).toBeNull();
    });
  });

  describe('Repository Disconnect', () => {
    it('should disconnect cleanly', async () => {
      // This test just verifies that disconnect doesn't throw
      await expect(repository.disconnect()).resolves.not.toThrow();
    });
  });
});
