import { describe, expect, it, vi } from 'vitest';

import { publishExample } from './mqtt-publisher';

type MockHandlerMap = Map<string, (...args: any[]) => void>;

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
    on: vi.fn((event: string, cb: (...args: any[]) => void) => {
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
      deviceId: 'device-1',
      deviceToken: 'token-1',
      topic: 'sensors/demo',
      payload: { foo: 'bar' },
      mqttConnect: connectMock,
    });

    handlers.get('connect')?.();

    await promise;

    expect(connectMock).toHaveBeenCalledWith('mqtt://localhost:1883', {
      clientId: 'device-1',
      username: 'device-1',
      password: 'token-1',
      clean: true,
      reconnectPeriod: 0,
    });

    expect(client.publish).toHaveBeenCalledTimes(1);
    const [topic, payload] = client.publish.mock.calls[0];
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
      deviceId: 'device-1',
      deviceToken: 'token-1',
      topic: 'sensors/demo',
      mqttConnect: connectMock,
    });

    handlers.get('connect')?.();

    await expect(promise).rejects.toThrow('publish failed');
    expect(client.end).toHaveBeenCalled();
  });
});
