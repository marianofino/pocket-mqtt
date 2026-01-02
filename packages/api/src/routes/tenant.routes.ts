/// <reference path="../types.d.ts" />

import type { FastifyInstance, FastifyPluginOptions, FastifyRequest, FastifyReply } from 'fastify';
import type { TenantService } from '../services/TenantService.js';
import type { UserService } from '../services/UserService.js';

/**
 * Options for tenant routes plugin
 */
export interface TenantRoutesOptions extends FastifyPluginOptions {
  tenantService: TenantService;
  userService: UserService;
}

// Rate limiting state for tenant creation (in-memory, simple implementation)
// This is a module-level variable so it persists across test runs within the same process
// For production, consider using a distributed cache (Redis) for rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 5; // Max 5 tenant creation attempts per minute per IP

/**
 * Simple rate limiter for tenant creation endpoint
 */
function checkRateLimit(ip: string): boolean {
  // Disable rate limiting in test environment to keep tests deterministic
  if (process.env.NODE_ENV === 'test') {
    return true;
  }

  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetTime) {
    // New window or expired window
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    // Clean up expired entries to prevent memory leak
    for (const [key, value] of rateLimitMap.entries()) {
      if (now > value.resetTime) {
        rateLimitMap.delete(key);
      }
    }
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false; // Rate limit exceeded
  }

  entry.count++;
  return true;
}

/**
 * Tenant route plugin
 * Provides endpoints for managing tenants and per-tenant users
 */
export async function tenantRoutes(
  fastify: FastifyInstance,
  opts: TenantRoutesOptions
): Promise<void> {
  const { tenantService, userService } = opts;

  /**
   * POST /api/v1/tenant - Create a new tenant (public, rate-limited)
   * Validates token (with 1-minute expiration) and creates tenant with unique API key
   * Rate limit: 5 successful creations per minute per IP address
   * 
   * @param request - Fastify request with name and token in body
   * @param reply - Fastify reply object
   * @returns Created tenant with API key
   */
  fastify.post('/api/v1/tenant', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as { name?: string; token?: string } | undefined;
    const { name, token } = body ?? {};
    
    // Validate name
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return reply.code(400).send({ error: 'name is required and must be a non-empty string' });
    }

    // Validate token
    if (!token || typeof token !== 'string' || token.trim().length === 0) {
      return reply.code(400).send({ error: 'token is required and must be a non-empty string' });
    }

    // Apply rate limiting based on IP address (only for valid requests)
    const clientIp = request.ip;
    if (!checkRateLimit(clientIp)) {
      return reply.code(429).send({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Maximum 5 tenant creation attempts per minute.'
      });
    }

    try {
      const tenant = await tenantService.createTenant({
        name: name.trim(),
        token: token.trim()
      });

      return reply.code(201).send({
        id: tenant.id,
        name: tenant.name,
        apiKey: tenant.apiKey
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      
      // Handle specific error cases
      if (err.message.includes('already exists')) {
        return reply.code(409).send({ error: err.message });
      }
      
      if (err.message.includes('Invalid tenant token')) {
        return reply.code(401).send({ error: err.message });
      }

      if (err.message.includes('name must contain only')) {
        return reply.code(400).send({ error: err.message });
      }
      
      fastify.log.error({ err }, 'Error creating tenant');
      return reply.code(500).send({ error: 'Failed to create tenant' });
    }
  });

  /**
   * POST /api/v1/tenant/:tenantId/user - Create a user for a tenant (protected)
   * Requires authentication via JWT or tenant API key
   * Creates a per-tenant admin user with hashed password
   * 
   * @param request - Fastify request with tenantId parameter and username, password in body
   * @param reply - Fastify reply object
   * @returns Created user (without password hash)
   */
  fastify.post('/api/v1/tenant/:tenantId/user', {
    onRequest: [fastify.authenticateFlexible]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as { tenantId: string };
    const tenantId = parseInt(params.tenantId, 10);
    
    if (Number.isNaN(tenantId) || tenantId < 1) {
      return reply.code(400).send({ error: 'tenantId must be a positive integer' });
    }

    // Verify the authenticated tenant matches the requested tenantId
    // This ensures per-tenant scoping and isolation
    const authenticatedTenant = request.tenant;
    if (!authenticatedTenant || authenticatedTenant.id !== tenantId) {
      return reply.code(403).send({ error: 'Cannot create users for a different tenant' });
    }

    const body = request.body as { username?: string; password?: string } | undefined;
    const { username, password } = body ?? {};
    
    // Validate username
    if (!username || typeof username !== 'string' || username.trim().length === 0) {
      return reply.code(400).send({ error: 'username is required and must be a non-empty string' });
    }

    // Validate password
    if (!password || typeof password !== 'string' || password.length < 8) {
      return reply.code(400).send({ error: 'password is required and must be at least 8 characters' });
    }

    try {
      const user = await userService.createUser({
        tenantId,
        username: username.trim(),
        password
      });

      // Return user without password hash
      return reply.code(201).send({
        success: true,
        user: {
          id: user.id,
          tenantId: user.tenantId,
          username: user.username,
          createdAt: user.createdAt
        }
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      
      // Handle specific error cases
      if (err.message.includes('already exists')) {
        return reply.code(409).send({ error: err.message });
      }
      
      fastify.log.error({ err }, 'Error creating user');
      return reply.code(500).send({ error: 'Failed to create user' });
    }
  });
}
