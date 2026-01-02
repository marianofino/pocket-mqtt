import { describe, expect, it, vi } from 'vitest';

type RegisterRoutesFn = (instance: any, opts: any) => Promise<void>;

vi.mock('@fastify/jwt', () => ({
  default: vi.fn((instance: any) => {
    instance.decorate('jwt', {});
  })
}));

vi.mock('./routes/index.js', () => {
  const registerRoutes = vi.fn<RegisterRoutesFn>(async () => {});
  return { registerRoutes };
});

import { APIServer } from './server.js';
import { registerRoutes } from './routes/index.js';

const registerRoutesMock = vi.mocked(registerRoutes);

const fakeTelemetry = {} as any;
const fakeDeviceService = {
  getTenantByApiKey: vi.fn(),
  getTenantById: vi.fn()
} as any;
const fakeTenantService = {
  getTenantByApiKey: vi.fn(),
  getTenantById: vi.fn()
} as any;
const fakeUserService = {} as any;

describe('APIServer', () => {
  it('constructs with provided services and registers routes', async () => {
    const server = new APIServer(
      fakeTelemetry,
      fakeDeviceService,
      fakeTenantService,
      fakeUserService,
      { jwtSecret: 'test-secret' }
    );

    const fastify = server.getFastify();
    await fastify.ready();
    expect(typeof fastify.authenticate).toBe('function');
    expect(typeof fastify.authenticateFlexible).toBe('function');
    expect(registerRoutesMock).toHaveBeenCalledTimes(1);

  const args = registerRoutesMock.mock.calls[0]?.[1] as any;
    expect(args?.telemetryService).toBe(fakeTelemetry);
    expect(args?.deviceService).toBe(fakeDeviceService);
    expect(args?.tenantService).toBe(fakeTenantService);
    expect(args?.userService).toBe(fakeUserService);

    await server.stop();
  });
});
