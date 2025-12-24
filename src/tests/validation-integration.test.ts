import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { TelemetryService } from '../services/TelemetryService.js';
import { disconnectPrisma, getRepository } from '../database.js';
import type { IRepository } from '../repository/interfaces.js';

describe('TelemetryService with Zod Validation', () => {
  let service: TelemetryService;
  let repository: IRepository;

  beforeAll(async () => {
    repository = getRepository();
    await repository.telemetry.deleteAll();
  });

  beforeEach(async () => {
    await repository.telemetry.deleteAll();
    service = new TelemetryService();
  });

  afterEach(async () => {
    await service.stop();
    await repository.telemetry.deleteAll();
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  afterAll(async () => {
    await disconnectPrisma();
  });

  describe('Zod Validation Integration', () => {
    it('should accept valid MQTT payload', async () => {
      await service.addMessage('sensor/temperature', '{"value": 25.5}');
      
      // Force flush
      await service.flush();
      
      const count = await repository.telemetry.count({});
      expect(count).toBe(1);
    });

    it('should discard payload with empty topic', async () => {
      await service.addMessage('', '{"value": 25.5}');
      
      // Force flush
      await service.flush();
      
      const count = await repository.telemetry.count({});
      expect(count).toBe(0);
    });

    it('should discard payload with empty payload string', async () => {
      await service.addMessage('sensor/temperature', '');
      
      // Force flush
      await service.flush();
      
      const count = await repository.telemetry.count({});
      expect(count).toBe(0);
    });

    it('should accept multiple valid payloads and discard invalid ones', async () => {
      await service.addMessage('sensor/temperature', '{"value": 25.5}'); // valid
      await service.addMessage('', '{"value": 30}'); // invalid - empty topic
      await service.addMessage('sensor/humidity', '{"value": 60}'); // valid
      await service.addMessage('sensor/pressure', ''); // invalid - empty payload
      await service.addMessage('sensor/wind', '{"value": 10}'); // valid
      
      // Force flush
      await service.flush();
      
      const count = await repository.telemetry.count({});
      expect(count).toBe(3); // Only 3 valid messages
      
      const records = await repository.telemetry.findMany({});
      expect(records.some(r => r.topic === 'sensor/temperature')).toBe(true);
      expect(records.some(r => r.topic === 'sensor/humidity')).toBe(true);
      expect(records.some(r => r.topic === 'sensor/wind')).toBe(true);
    });

    it('should not add invalid messages to buffer', async () => {
      await service.addMessage('', 'invalid');
      await service.addMessage('sensor/temp', '');
      
      // Check buffer size
      expect(service.getBufferSize()).toBe(0);
    });

    it('should handle validation errors gracefully without throwing', async () => {
      // Should not throw
      await expect(service.addMessage('', 'payload')).resolves.not.toThrow();
      await expect(service.addMessage('topic', '')).resolves.not.toThrow();
    });
  });

  describe('Repository Pattern Integration', () => {
    it('should use repository for database operations', async () => {
      const repo = service.getRepository();
      expect(repo).toBeDefined();
      expect(repo.telemetry).toBeDefined();
      expect(repo.deviceToken).toBeDefined();
    });

    it('should flush messages using repository', async () => {
      await service.addMessage('test/topic', 'test payload');
      
      await service.flush();
      
      const records = await repository.telemetry.findMany({});
      expect(records).toHaveLength(1);
      expect(records[0].topic).toBe('test/topic');
      expect(records[0].payload).toBe('test payload');
    });
  });
});
