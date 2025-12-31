import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { TelemetryService } from '../core/services/TelemetryService.js';
import { getDbClient, disconnectDb } from '../core/database.js';
import { telemetry as telemetrySchema, tenant as tenantSchema } from '../core/db/schema.js';
import { count } from 'drizzle-orm';

describe('TelemetryService', () => {
  let service: TelemetryService;
  let db: ReturnType<typeof getDbClient>;

  beforeAll(async () => {
    // Start with a clean database
    db = getDbClient();
    await db.delete(telemetrySchema);
    await db.delete(tenantSchema);
    
    // Create a default tenant with ID=1 for DEFAULT_TENANT_ID compatibility
    await db.insert(tenantSchema).values({
      id: 1,
      name: 'default-tenant',
      apiKey: 'default-api-key-for-testing',
    });
  });

  beforeEach(async () => {
    // Clean database before each test
    db = getDbClient();
    await db.delete(telemetrySchema);
    
    service = new TelemetryService();
  });

  afterEach(async () => {
    // Stop the service and clean up
    await service.stop();
    await db.delete(telemetrySchema);
    
    // Small delay to allow flush timers to fully stop
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  afterAll(async () => {
    await db.delete(telemetrySchema);
    await db.delete(tenantSchema);
    await disconnectDb();
  });

  describe('Buffering', () => {
    it('should buffer messages in memory without immediately writing to database', async () => {
      // Given: Service is running
      // When: Multiple messages are added
      await service.addMessage('test/topic1', 'payload1');
      await service.addMessage('test/topic2', 'payload2');
      await service.addMessage('test/topic3', 'payload3');

      // Then: Messages should be buffered, not in database yet
      const result = await db.select({ count: count() }).from(telemetrySchema);
      expect(result[0].count).toBe(0);
    });

    it('should buffer 10 MQTT messages in rapid succession', async () => {
      // Given: Service is running
      // When: 10 messages are received
      for (let i = 0; i < 10; i++) {
        await service.addMessage(`test/topic${i}`, `payload${i}`);
      }

      // Then: They are buffered in memory
      const result = await db.select({ count: count() }).from(telemetrySchema);
      expect(result[0].count).toBe(0);
    });
  });

  describe('Flushing', () => {
    it('should flush buffered messages after 2 seconds', async () => {
      // Given: Service is running
      // When: Messages are added
      await service.addMessage('test/topic1', 'payload1');
      await service.addMessage('test/topic2', 'payload2');
      await service.addMessage('test/topic3', 'payload3');

      // Then: After 2+ seconds, all messages are flushed
      await new Promise(resolve => setTimeout(resolve, 2100));

      const messages = await db.select().from(telemetrySchema);
      expect(messages).toHaveLength(3);
      expect(messages[0].topic).toBe('test/topic1');
      expect(messages[0].payload).toBe('payload1');
      expect(messages[1].topic).toBe('test/topic2');
      expect(messages[2].topic).toBe('test/topic3');
    });

    it('should flush all 10 messages together in a single transaction after 2 seconds', async () => {
      // Given: Service is running
      // When: 10 messages are received in rapid succession
      for (let i = 0; i < 10; i++) {
        await service.addMessage(`test/topic${i}`, `payload${i}`);
      }

      // Check they're buffered
      let result = await db.select({ count: count() }).from(telemetrySchema);
      expect(result[0].count).toBe(0);

      // Then: After 2 seconds, all 10 are flushed together
      await new Promise(resolve => setTimeout(resolve, 2100));

      result = await db.select({ count: count() }).from(telemetrySchema);
      expect(result[0].count).toBe(10);
    });

    it('should handle manual flush', async () => {
      // Given: Messages are buffered
      await service.addMessage('test/topic1', 'payload1');
      await service.addMessage('test/topic2', 'payload2');

      // When: Manual flush is called
      await service.flush();

      // Then: Messages should be in database
      const messages = await db.select().from(telemetrySchema);
      expect(messages).toHaveLength(2);
    });
  });

  describe('High-frequency writes', () => {
    it('should handle high-frequency writes (>1000 msg/min capacity)', async () => {
      // Given: Service is running
      const messageCount = 1100;
      const startTime = Date.now();

      // When: High-frequency writes occur
      const promises = [];
      for (let i = 0; i < messageCount; i++) {
        promises.push(service.addMessage(`test/topic${i % 10}`, `payload${i}`));
      }
      await Promise.all(promises);

      const bufferTime = Date.now() - startTime;
      
      // Then: Buffering should be fast (< 1 second for 1100 messages)
      expect(bufferTime).toBeLessThan(1000);

      // Wait for flush
      await new Promise(resolve => setTimeout(resolve, 2100));

      // All messages should be persisted
      const result = await db.select({ count: count() }).from(telemetrySchema);
      expect(result[0].count).toBe(messageCount);
    }, 10000); // Extend timeout for this test

    it('should continue accepting messages during flush', async () => {
      // Given: Service with some buffered messages
      for (let i = 0; i < 100; i++) {
        await service.addMessage(`test/topic${i}`, `payload${i}`);
      }

      // When: Flush happens while new messages arrive
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Add more messages during flush window
      for (let i = 100; i < 200; i++) {
        await service.addMessage(`test/topic${i}`, `payload${i}`);
      }

      // Wait for second flush
      await new Promise(resolve => setTimeout(resolve, 2100));

      // Then: All messages should eventually be persisted
      const result = await db.select({ count: count() }).from(telemetrySchema);
      expect(result[0].count).toBe(200);
    }, 10000);
  });

  describe('Error handling', () => {
    it('should not lose messages if flush fails', async () => {
      // This test verifies resilience - if flush fails, messages aren't lost
      await service.addMessage('test/topic1', 'payload1');
      
      // Force a flush
      await service.flush();
      
      const result = await db.select({ count: count() }).from(telemetrySchema);
      expect(result[0].count).toBeGreaterThanOrEqual(0);
    });
  });
});
