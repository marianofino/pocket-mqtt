import type { FastifyInstance, FastifyPluginOptions, FastifyRequest, FastifyReply } from 'fastify';
import fastifyStatic from '@fastify/static';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Admin dashboard route plugin
 * Serves static admin dashboard files and provides admin login API
 */
export async function adminRoutes(
  fastify: FastifyInstance,
  _opts: FastifyPluginOptions
): Promise<void> {
  // Register static file serving for admin dashboard
  // Serve files from public/admin directory at /admin route
  await fastify.register(fastifyStatic, {
    root: path.join(__dirname, '../../../public/admin'),
    prefix: '/admin/',
    decorateReply: false // Don't decorate reply to avoid conflicts
  });

  // Manually serve login.html at /admin/login (without .html extension)
  fastify.get('/admin/login', async (_request: FastifyRequest, reply: FastifyReply) => {
    const loginPath = path.join(__dirname, '../../../public/admin/login.html');
    const content = await readFile(loginPath, 'utf-8');
    reply.type('text/html').send(content);
  });

  /**
   * Admin login endpoint - generates JWT tokens for admin users
   * This is separate from the main /api/v1/auth/login to allow for different
   * authentication logic if needed in the future
   * 
   * @param request - Fastify request with username and password in body
   * @param reply - Fastify reply object
   * @returns JWT token or error message
   */
  fastify.post('/api/admin/login', async (request: FastifyRequest, reply: FastifyReply): Promise<{ token: string } | void> => {
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
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    
    if (username === adminUsername && password === adminPassword) {
      const token = fastify.jwt.sign({ username }, { expiresIn: '1h' });
      return { token };
    }
    
    return reply.code(401).send({ error: 'Invalid credentials' });
  });
}
