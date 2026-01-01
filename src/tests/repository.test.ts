import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { createMessageRepository } from '../core/repositories/repository.factory.js';
import type { MessageRepository } from '../core/repositories/MessageRepository.interface.js';
import { getDbClient, disconnectDb, getDbAdapter } from '../core/database.js';
import { tenant as tenantSchema } from '../core/db/schema.js';

describe('Repository Pattern', () => {
  let repository: MessageRepository;
  let db: ReturnType<typeof getDbClient>;
  let defaultTenantId: number;

  beforeAll(async () => {
    // Ensure we start with a clean database
    db = getDbClient();
    const repo = createMessageRepository();
    await repo.deleteAll();
    
    // Clean up tenants
    await db.delete(tenantSchema);
    
    // Create a default tenant for tests
    const tenantResult = await db.insert(tenantSchema).values({
      name: 'test-tenant',
      apiKey: 'test-api-key-for-repository-tests',
    }).returning();
    defaultTenantId = tenantResult[0].id;
  });

  beforeEach(async () => {
    repository = createMessageRepository();
    await repository.deleteAll();
  });

  afterEach(async () => {
    await repository.deleteAll();
  });

  afterAll(async () => {
    await db.delete(tenantSchema);
    await disconnectDb();
  });

  it('should use correct adapter based on environment', () => {
    const adapter = getDbAdapter();
    expect(['sqlite', 'postgres']).toContain(adapter);
  });

  describe('insertBatch', () => {
    it('should insert multiple messages in a batch', async () => {
      const messages = [
        { tenantId: defaultTenantId, topic: 'test/topic1', payload: 'payload1', timestamp: new Date() },
        { tenantId: defaultTenantId, topic: 'test/topic2', payload: 'payload2', timestamp: new Date() },
        { tenantId: defaultTenantId, topic: 'test/topic3', payload: 'payload3', timestamp: new Date() },
      ];

      await repository.insertBatch(messages);

      const count = await repository.count();
      expect(count).toBe(3);
    });

    it('should handle empty batch', async () => {
      await repository.insertBatch([]);

      const count = await repository.count();
      expect(count).toBe(0);
    });
  });

  describe('findMany', () => {
    beforeEach(async () => {
      // Insert test data with timestamps relative to "now" to test ordering
      const baseTime = Date.now();
      await repository.insertBatch([
        { tenantId: defaultTenantId, topic: 'sensor/temp', payload: '{"temp": 20}', timestamp: new Date(baseTime - 3 * 60 * 60 * 1000) }, // 3 hours ago
        { tenantId: defaultTenantId, topic: 'sensor/temp', payload: '{"temp": 21}', timestamp: new Date(baseTime - 2 * 60 * 60 * 1000) }, // 2 hours ago
        { tenantId: defaultTenantId, topic: 'sensor/humidity', payload: '{"humidity": 60}', timestamp: new Date(baseTime - 1 * 60 * 60 * 1000) }, // 1 hour ago
        { tenantId: defaultTenantId, topic: 'sensor/temp', payload: '{"temp": 22}', timestamp: new Date(baseTime) }, // now
      ]);
    });

    it('should find all messages', async () => {
      const messages = await repository.findMany({ limit: 100, offset: 0 });
      expect(messages.length).toBe(4);
    });

    it('should filter by topic', async () => {
      const messages = await repository.findMany({ topic: 'sensor/temp', limit: 100, offset: 0 });
      expect(messages.length).toBe(3);
      messages.forEach(msg => {
        expect(msg.topic).toBe('sensor/temp');
      });
    });

    it('should apply limit', async () => {
      const messages = await repository.findMany({ limit: 2, offset: 0 });
      expect(messages.length).toBe(2);
    });

    it('should apply offset', async () => {
      const messages = await repository.findMany({ limit: 10, offset: 2 });
      expect(messages.length).toBe(2);
    });

    it('should return messages in descending order by timestamp', async () => {
      const messages = await repository.findMany({ limit: 100, offset: 0 });
      // Should be ordered newest first
      for (let i = 0; i < messages.length - 1; i++) {
        const current = new Date(messages[i].timestamp).getTime();
        const next = new Date(messages[i + 1].timestamp).getTime();
        expect(current).toBeGreaterThanOrEqual(next);
      }
    });
  });

  describe('count', () => {
    beforeEach(async () => {
      await repository.insertBatch([
        { tenantId: defaultTenantId, topic: 'sensor/temp', payload: '{"temp": 20}', timestamp: new Date() },
        { tenantId: defaultTenantId, topic: 'sensor/temp', payload: '{"temp": 21}', timestamp: new Date() },
        { tenantId: defaultTenantId, topic: 'sensor/humidity', payload: '{"humidity": 60}', timestamp: new Date() },
      ]);
    });

    it('should count all messages', async () => {
      const count = await repository.count();
      expect(count).toBe(3);
    });

    it('should count messages by topic', async () => {
      const count = await repository.count('sensor/temp');
      expect(count).toBe(2);
    });

    it('should return 0 for non-existent topic', async () => {
      const count = await repository.count('non/existent');
      expect(count).toBe(0);
    });
  });

  describe('deleteAll', () => {
    it('should delete all messages', async () => {
      await repository.insertBatch([
        { tenantId: defaultTenantId, topic: 'test/topic', payload: 'payload', timestamp: new Date() },
      ]);

      let count = await repository.count();
      expect(count).toBe(1);

      await repository.deleteAll();

      count = await repository.count();
      expect(count).toBe(0);
    });
  });
});
