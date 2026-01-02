import type { FastifyInstance } from 'fastify';
import type { TelemetryService } from '@pocket/telemetry-service';
import type { DeviceService } from '../services/DeviceService.js';
import type { TenantService } from '../services/TenantService.js';
import type { UserService } from '../services/UserService.js';
import { healthRoutes } from './health.routes.js';
import { authRoutes } from './auth.routes.js';
import { telemetryRoutes } from './telemetry.routes.js';
import { deviceRoutes } from './device.routes.js';
import { tenantRoutes } from './tenant.routes.js';

/**
 * Options for registering all routes
 */
export interface RegisterRoutesOptions {
  telemetryService: TelemetryService;
  deviceService: DeviceService;
  tenantService: TenantService;
  userService: UserService;
  maxPayloadSize: number;
}

/**
 * Register all route plugins with the Fastify instance
 * This is the central entry point for all API routes
 * 
 * @param fastify - Fastify instance to register routes with
 * @param options - Options containing service dependencies
 */
export async function registerRoutes(
  fastify: FastifyInstance,
  options: RegisterRoutesOptions
): Promise<void> {
  // Register health check routes (public)
  await fastify.register(healthRoutes);
  
  // Register authentication routes (public)
  await fastify.register(authRoutes);
  
  // Register tenant routes (public for tenant creation)
  await fastify.register(tenantRoutes, {
    tenantService: options.tenantService,
    userService: options.userService
  });
  
  // Register telemetry routes (protected)
  await fastify.register(telemetryRoutes, {
    telemetryService: options.telemetryService,
    maxPayloadSize: options.maxPayloadSize
  });

  // Register device routes (protected)
  await fastify.register(deviceRoutes, {
    deviceService: options.deviceService
  });
}
