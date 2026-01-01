import type { FastifyInstance, FastifyPluginOptions, FastifyRequest, FastifyReply } from 'fastify';
import { validateAdminCredentials } from '../../core/utils/admin-auth.js';

/**
 * Authentication route plugin
 * Provides JWT-based authentication endpoints
 */
export async function authRoutes(
  fastify: FastifyInstance,
  _opts: FastifyPluginOptions
): Promise<void> {
  /**
   * Login endpoint - public (generates JWT tokens)
   * Validates credentials and returns a JWT token on success
   * 
   * @param request - Fastify request with username and password in body
   * @param reply - Fastify reply object
   * @returns JWT token or error message
   */
  fastify.post('/api/v1/auth/login', async (request: FastifyRequest, reply: FastifyReply): Promise<{ token: string } | void> => {
    const body = request.body as { username: string; password: string } | undefined;
    const { username, password } = body ?? {};
    
    // Validate input
    if (!username || typeof username !== 'string' || username.trim().length === 0) {
      return reply.code(400).send({ error: 'Username is required and must be a non-empty string' });
    }
    
    if (!password || typeof password !== 'string' || password.trim().length === 0) {
      return reply.code(400).send({ error: 'Password is required and must be a non-empty string' });
    }
    
    // Demo authentication - In production, use proper user management with hashed passwords
    // Configure via environment variables: ADMIN_USERNAME and ADMIN_PASSWORD
    if (validateAdminCredentials(username, password)) {
      const token = fastify.jwt.sign({ username }, { expiresIn: '1h' });
      return { token };
    }
    
    return reply.code(401).send({ error: 'Invalid credentials' });
  });
}
