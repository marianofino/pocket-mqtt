import Fastify from 'fastify';
import fastifyJwt from '@fastify/jwt';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { registerRoutes } from './routes/index.js';
import type { TelemetryService } from '../services/TelemetryService.js';

export interface ApiServerConfig {
  port?: number;
  host?: string;
  jwtSecret?: string;
  telemetryService: TelemetryService;
  maxPayloadSize?: number;
}

/**
 * REST API Server
 * Handles HTTP requests for telemetry, authentication, and health checks
 */
export class ApiServer {
  private port: number;
  private host: string;
  private fastify: FastifyInstance;
  private jwtSecret: string;
  private telemetryService: TelemetryService;
  private readonly maxPayloadSize: number;

  constructor(config: ApiServerConfig) {
    this.port = config.port ?? 3000;
    this.host = config.host ?? '127.0.0.1';
    this.telemetryService = config.telemetryService;
    this.maxPayloadSize = config.maxPayloadSize ?? 64 * 1024; // 64KB max payload size
    
    // Get JWT secret from config, environment, or generate a warning
    const providedSecret = config.jwtSecret ?? process.env.JWT_SECRET;
    if (!providedSecret) {
      console.warn('WARNING: No JWT_SECRET provided. Using a default secret for development only. This is NOT secure for production!');
      this.jwtSecret = 'dev-secret-please-change-in-production';
    } else {
      this.jwtSecret = providedSecret;
    }
    
    // Initialize Fastify API
    this.fastify = Fastify({
      logger: true
    });
    
    // Setup JWT authentication
    this.setupJWT();
    
    // Setup routes
    this.setupRoutes();
  }

  /**
   * Setup JWT authentication plugin and decorator
   */
  private setupJWT(): void {
    // Register JWT plugin
    this.fastify.register(fastifyJwt, {
      secret: this.jwtSecret
    });

    // Add authentication decorator
    this.fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await request.jwtVerify();
      } catch (err) {
        reply.code(401).send({ error: 'Unauthorized' });
      }
    });
  }

  /**
   * Setup API routes
   */
  private setupRoutes(): void {
    // Register all routes using the modular plugin system
    this.fastify.register(registerRoutes, {
      telemetryService: this.telemetryService,
      maxPayloadSize: this.maxPayloadSize
    });
  }

  /**
   * Start the API server
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
   * Stop the API server
   */
  async stop(): Promise<void> {
    try {
      await this.fastify.close();
    } catch (err) {
      throw err instanceof Error ? err : new Error(String(err));
    }
  }
}
