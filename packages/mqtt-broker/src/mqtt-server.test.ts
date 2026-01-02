import { describe, expect, it, vi, beforeEach } from 'vitest';
const netState = { listenCount: 0, closeCount: 0 };
vi.mock('net', () => ({
  createServer: () => ({
    listen: (_: any, cb?: (err?: Error) => void) => {
      netState.listenCount++;
      cb?.();
    },
    close: (cb?: (err?: Error | undefined) => void) => {
      netState.closeCount++;
      cb?.();
    }
  })
}));

const brokerMocks = { authCalls: 0, handlerCalls: 0 };
vi.mock('./authentication.js', () => ({
  setupMQTTAuthentication: () => {
    brokerMocks.authCalls++;
  }
}));

vi.mock('./handlers.js', () => ({
  setupMQTTHandlers: () => {
    brokerMocks.handlerCalls++;
  }
}));

import { MQTTServer } from './mqtt-server.js';

describe('MQTTServer', () => {
  beforeEach(() => {
    netState.listenCount = 0;
    netState.closeCount = 0;
    brokerMocks.authCalls = 0;
    brokerMocks.handlerCalls = 0;
  });

  it('initializes broker with authentication and handlers', () => {
    const telemetryService = {} as any;
    const server = new MQTTServer(telemetryService);
    const aedes = server.getAedes();

    expect(brokerMocks.authCalls).toBe(1);
    expect(brokerMocks.handlerCalls).toBe(1);
    expect(server.getAedes()).toBe(aedes);
  });

  it('starts and stops the MQTT server', async () => {
    const telemetryService = {} as any;
    const logger = { info: vi.fn() };
    const server = new MQTTServer(telemetryService, { port: 1884, maxPayloadSize: 1024 });

    await server.start(logger);

    expect(netState.listenCount).toBe(1);
    expect(logger.info).toHaveBeenCalledWith('MQTT broker listening on port 1884');

    await server.stop();
    expect(netState.closeCount).toBe(1);
  });
});
