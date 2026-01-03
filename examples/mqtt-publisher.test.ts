import { describe, expect, it, vi } from 'vitest';

import { publishExample } from './mqtt-publisher';

type MockHandlerMap = Map<string, (...args: unknown[]) => void>;

type MockClient = {
  on: ReturnType<typeof vi.fn>;
  publish: ReturnType<typeof vi.fn>;
  end: ReturnType<typeof vi.fn>;
};

const createMockClient = (handlers: MockHandlerMap): MockClient => {
  const publish = vi.fn((topic: string, payload: string, _opts: unknown, cb?: (err?: Error | null) => void) => {
    cb?.(null);
  });

  const end = vi.fn((_force?: boolean, _opts?: unknown, cb?: () => void) => {
    cb?.();
  });

  const client: MockClient = {
    on: vi.fn((event: string, cb: (...args: unknown[]) => void) => {
      handlers.set(event, cb);
      return client;
    }),
    publish,
    end,
  };

  return client;
};

describe('mqtt-publisher example', () => {
  it('connects and publishes the provided payload, then disconnects', async () => {
    const handlers: MockHandlerMap = new Map();
    const client = createMockClient(handlers);
    const connectMock = vi.fn().mockReturnValue(client);

    const promise = publishExample({
      mqttHost: 'localhost',
      mqttPort: 1883,
      deviceToken: 'token-1',
      topic: 'sensors/demo',
      payload: { foo: 'bar' },
      mqttConnect: connectMock,
    });

    handlers.get('connect')?.();

    await promise;

    expect(connectMock).toHaveBeenCalledWith('mqtt://localhost:1883', expect.objectContaining({
      username: 'token-1',
      clean: true,
      reconnectPeriod: 0,
    }));

    // Verify clientId is dynamic (timestamp-based)
    const callArgs = connectMock.mock.calls[0][1];
    expect(callArgs.clientId).toMatch(/^publisher-\d+$/);
    expect(callArgs.password).toBeUndefined();

    expect(client.publish).toHaveBeenCalledTimes(1);
    const call = client.publish.mock.calls[0];
    if (!call) {
      throw new Error('Expected publish to be called');
    }
    const [topic, payload] = call;
    expect(topic).toBe('sensors/demo');
    expect(JSON.parse(payload)).toEqual({ foo: 'bar' });

    expect(client.end).toHaveBeenCalled();
  });

  it('rejects when publish fails', async () => {
    const handlers: MockHandlerMap = new Map();
    const client = createMockClient(handlers);

    client.publish.mockImplementationOnce((_topic, _payload, _opts, cb) => {
      cb?.(new Error('publish failed'));
    });

    const connectMock = vi.fn().mockReturnValue(client);

    const promise = publishExample({
      deviceToken: 'token-1',
      topic: 'sensors/demo',
      mqttConnect: connectMock,
    });

    handlers.get('connect')?.();

    await expect(promise).rejects.toThrow('publish failed');
    expect(client.end).toHaveBeenCalled();
  });
});
