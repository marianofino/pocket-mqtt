import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { createMessageRepository } from '../repositories/repository.factory.js';
import type { MessageRepository } from '../repositories/MessageRepository.interface.js';
import { getDbClient, disconnectDb, resetDbClient, getDbAdapter } from '../database.js';

describe('Repository Pattern', () => {
  let repository: MessageRepository;

  beforeAll(async () => {
    // Ensure we start with a clean database
    const db = getDbClient();
    const repo = createMessageRepository();
    await repo.deleteAll();
  });

  beforeEach(async () => {
    repository = createMessageRepository();
    await repository.deleteAll();
  });

  afterEach(async () => {
    await repository.deleteAll();
  });

  afterAll(async () => {
    await disconnectDb();
  });

  it('should use correct adapter based on environment', () => {
    const adapter = getDbAdapter();
    expect(['sqlite', 'postgres']).toContain(adapter);
  });

  describe('insertBatch', () => {
    it('should insert multiple messages in a batch', async () => {
      const messages = [
        { topic: 'test/topic1', payload: 'payload1', timestamp: new Date() },
        { topic: 'test/topic2', payload: 'payload2', timestamp: new Date() },
        { topic: 'test/topic3', payload: 'payload3', timestamp: new Date() },
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
      // Insert test data
      await repository.insertBatch([
        { topic: 'sensor/temp', payload: '{"temp": 20}', timestamp: new Date('2025-01-01T10:00:00Z') },
        { topic: 'sensor/temp', payload: '{"temp": 21}', timestamp: new Date('2025-01-01T11:00:00Z') },
        { topic: 'sensor/humidity', payload: '{"humidity": 60}', timestamp: new Date('2025-01-01T12:00:00Z') },
        { topic: 'sensor/temp', payload: '{"temp": 22}', timestamp: new Date('2025-01-01T13:00:00Z') },
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
        { topic: 'sensor/temp', payload: '{"temp": 20}', timestamp: new Date() },
        { topic: 'sensor/temp', payload: '{"temp": 21}', timestamp: new Date() },
        { topic: 'sensor/humidity', payload: '{"humidity": 60}', timestamp: new Date() },
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
        { topic: 'test/topic', payload: 'payload', timestamp: new Date() },
      ]);

      let count = await repository.count();
      expect(count).toBe(1);

      await repository.deleteAll();

      count = await repository.count();
      expect(count).toBe(0);
    });
  });
});
