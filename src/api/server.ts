import Fastify from 'fastify';
import fastifyJwt from '@fastify/jwt';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { TelemetryService } from '../core/services/TelemetryService.js';
import type { DeviceService } from '../core/services/DeviceService.js';
import type { TenantService } from '../core/services/TenantService.js';
import type { UserService } from '../core/services/UserService.js';
import { registerRoutes } from './routes/index.js';

export interface APIServerConfig {
  port?: number;
  host?: string;
  jwtSecret?: string;
  maxPayloadSize?: number;
}

/**
 * API Server wrapper for Fastify.
 * Handles API lifecycle, JWT authentication, and route registration.
 */
export class APIServer {
  private fastify: FastifyInstance;
  private port: number;
  private host: string;
  private jwtSecret: string;
  private maxPayloadSize: number;

  constructor(
    private telemetryService: TelemetryService,
    private deviceService: DeviceService,
    private tenantService: TenantService,
    private userService: UserService,
    config: APIServerConfig = {}
  ) {
    this.port = config.port ?? 3000;
    this.host = config.host ?? '127.0.0.1';
    this.maxPayloadSize = config.maxPayloadSize ?? 64 * 1024; // 64KB default
    
    // Get JWT secret from config, environment, or generate a warning
    const providedSecret = config.jwtSecret ?? process.env.JWT_SECRET;
    if (!providedSecret) {
      console.warn('WARNING: No JWT_SECRET provided. Using a default secret for development only. This is NOT secure for production!');
      this.jwtSecret = 'dev-secret-please-change-in-production';
    } else {
      this.jwtSecret = providedSecret;
    }
    
    // Initialize Fastify
    this.fastify = Fastify({
      logger: true
    });
    
    // Setup JWT authentication
    this.setupJWT();
    
    // Setup routes
    this.setupRoutes();
  }

  /**
   * Get the Fastify instance for direct access if needed.
   * Note: Should only be used after the server is fully started.
   */
  getFastify(): FastifyInstance {
    return this.fastify;
  }

  /**
   * Get the Fastify logger instance.
   * Safe to call immediately after construction, as the logger is available
   * as soon as the Fastify instance is created, before plugins are registered.
   */
  getLogger() {
    return this.fastify.log;
  }

  /**
   * Setup JWT authentication plugin and decorator.
   */
  private setupJWT(): void {
    // Register JWT plugin
    this.fastify.register(fastifyJwt, {
      secret: this.jwtSecret
    });

    // Add JWT authentication decorator (for admin/legacy endpoints)
    this.fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await request.jwtVerify();
      } catch (err) {
        reply.code(401).send({ error: 'Unauthorized' });
      }
    });

    // Add tenant API key authentication decorator
    this.fastify.decorate('authenticateTenant', async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // Extract Bearer token from Authorization header
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return reply.code(401).send({ error: 'Missing or invalid Authorization header. Expected format: Bearer <apiKey>' });
        }

        const apiKey = authHeader.substring(7); // Remove 'Bearer ' prefix
        if (!apiKey || apiKey.trim().length === 0) {
          return reply.code(401).send({ error: 'Invalid API key' });
        }

        // Validate API key against tenant database
        const tenant = await this.tenantService.getTenantByApiKey(apiKey.trim());
        if (!tenant) {
          return reply.code(401).send({ error: 'Invalid API key' });
        }

        // Attach tenant info to request for use in route handlers
        (request as any).tenant = tenant;
      } catch (err) {
        this.fastify.log.error({ err }, 'Error during tenant authentication');
        reply.code(401).send({ error: 'Unauthorized' });
      }
    });
  }

  /**
   * Setup API routes.
   */
  private setupRoutes(): void {
    // Register all routes using the modular plugin system
    this.fastify.register(registerRoutes, {
      telemetryService: this.telemetryService,
      deviceService: this.deviceService,
      tenantService: this.tenantService,
      userService: this.userService,
      maxPayloadSize: this.maxPayloadSize
    });
  }

  /**
   * Start the API server on the configured host and port.
   */
  async start(): Promise<void> {
    try {
      await this.fastify.listen({ port: this.port, host: this.host });
      this.fastify.log.info(`Fastify API listening on ${this.host}:${this.port}`);
    } catch (err) {
      const message = `Failed to start Fastify API on ${this.host}:${this.port}`;
      if (err instanceof Error) {
        throw new Error(message, { cause: err });
      }
      throw new Error(`${message}: ${String(err)}`);
    }
  }

  /**
   * Stop the API server and clean up resources.
   */
  async stop(): Promise<void> {
    await this.fastify.close();
  }
}
