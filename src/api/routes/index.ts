import type { FastifyInstance } from 'fastify';
import type { TelemetryService } from '../../services/TelemetryService.js';
import { healthRoutes } from './health.routes.js';
import { authRoutes } from './auth.routes.js';
import { telemetryRoutes } from './telemetry.routes.js';

/**
 * Options for registering all routes
 */
export interface RegisterRoutesOptions {
  telemetryService: TelemetryService;
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
  
  // Register telemetry routes (protected)
  await fastify.register(telemetryRoutes, {
    telemetryService: options.telemetryService,
    maxPayloadSize: options.maxPayloadSize
  });
}
