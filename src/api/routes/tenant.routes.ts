import type { FastifyInstance, FastifyPluginOptions, FastifyRequest, FastifyReply } from 'fastify';
import type { TenantService } from '../../core/services/TenantService.js';
import type { UserService } from '../../core/services/UserService.js';

/**
 * Options for tenant routes plugin
 */
export interface TenantRoutesOptions extends FastifyPluginOptions {
  tenantService: TenantService;
  userService: UserService;
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
   * POST /api/v1/tenant - Create a new tenant (public)
   * Validates token and creates tenant with unique API key
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
   * Requires tenant API key authentication via Bearer token
   * Creates a per-tenant admin user with hashed password
   * 
   * @param request - Fastify request with tenantId parameter and username, password in body
   * @param reply - Fastify reply object
   * @returns Created user (without password hash)
   */
  fastify.post('/api/v1/tenant/:tenantId/user', {
    onRequest: [fastify.authenticateTenant]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as { tenantId: string };
    const tenantId = parseInt(params.tenantId, 10);
    
    if (Number.isNaN(tenantId) || tenantId < 1) {
      return reply.code(400).send({ error: 'tenantId must be a positive integer' });
    }

    // Verify the authenticated tenant matches the requested tenantId
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
