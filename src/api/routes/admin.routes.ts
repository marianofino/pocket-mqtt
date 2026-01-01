import type { FastifyInstance, FastifyPluginOptions, FastifyRequest, FastifyReply } from 'fastify';
import fastifyStatic from '@fastify/static';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { validateAdminCredentials } from '../../core/utils/admin-auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Admin dashboard route plugin
 * Serves static admin dashboard SPA (Vite + React) and provides admin login API
 */
export async function adminRoutes(
  fastify: FastifyInstance,
  _opts: FastifyPluginOptions
): Promise<void> {
  const adminDistPath = path.join(__dirname, '../../../dist/public/admin');
  
  // Check if admin dashboard is built
  if (!existsSync(adminDistPath)) {
    fastify.log.warn('Admin dashboard not built. Run `npm run build:dashboard` to build it.');
    
    // Serve a placeholder message if dashboard is not built
    fastify.get('/admin/*', async (_request: FastifyRequest, reply: FastifyReply) => {
      reply.type('text/html').send(`
        <!DOCTYPE html>
        <html>
          <head><title>PocketMQTT Admin</title></head>
          <body style="font-family: system-ui; padding: 2rem; text-align: center;">
            <h1>Admin Dashboard Not Built</h1>
            <p>Please run <code>npm run build:dashboard</code> to build the admin dashboard.</p>
          </body>
        </html>
      `);
    });
  } else {
    // Register static file serving for admin dashboard SPA
    // Use wildcard:false to prevent automatic wildcard route, then add custom fallback
    await fastify.register(fastifyStatic, {
      root: adminDistPath,
      prefix: '/admin/',
      decorateReply: false,
      wildcard: false,
    });

    // SPA fallback - serve index.html for all /admin/* routes that don't match static files
    // Using setNotFoundHandler scoped to /admin prefix
    fastify.setNotFoundHandler(async (request: FastifyRequest, reply: FastifyReply) => {
      if (request.url.startsWith('/admin/') || request.url === '/admin') {
        const indexPath = path.join(adminDistPath, 'index.html');
        const content = await readFile(indexPath, 'utf-8');
        reply.type('text/html').send(content);
      } else {
        reply.code(404).send({ error: 'Not Found' });
      }
    });
  }

  /**
   * Admin login endpoint - generates JWT tokens for admin users
   * Uses JWT Bearer tokens (Authorization header) for dashboard authentication
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
    if (validateAdminCredentials(username, password)) {
      const token = fastify.jwt.sign({ username }, { expiresIn: '1h' });
      return { token };
    }
    
    return reply.code(401).send({ error: 'Invalid credentials' });
  });
}

