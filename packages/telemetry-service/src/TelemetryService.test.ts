import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

const insertBatch = vi.fn<(messages: unknown[]) => Promise<void>>(() => Promise.resolve());

vi.mock('@pocket-mqtt/db', () => ({
  createMessageRepository: () => ({ insertBatch })
}));

// Import after mocking
import { TelemetryService } from './TelemetryService.js';

describe('TelemetryService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    insertBatch.mockClear();
  });

  afterEach(async () => {
    vi.useRealTimers();
  });

  it('buffers messages and flushes when max buffer is reached', async () => {
    const service = new TelemetryService();

    // Fill buffer to max - 1
    for (let i = 0; i < 99; i++) {
      await service.addMessage(`topic/${i}`, `payload-${i}`, 1);
    }
    expect(service.getBufferSize()).toBe(99);
    expect(insertBatch).not.toHaveBeenCalled();

    // Next message should trigger flush
    await service.addMessage('topic/99', 'payload-99', 1);

    // Flush is awaited inside addMessage when buffer reaches max
    expect(insertBatch).toHaveBeenCalledTimes(1);
    const payload = insertBatch.mock.calls[0]?.[0];
    expect(Array.isArray(payload)).toBe(true);
    expect(payload).toHaveLength(100);

    await service.stop();
  });

  it('rejects invalid tenant ids', async () => {
    const service = new TelemetryService();
    await expect(service.addMessage('t', 'p', 0)).rejects.toThrow('tenantId is required');
    await service.stop();
  });
});
