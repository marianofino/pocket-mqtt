import type { FastifyInstance, FastifyPluginOptions } from 'fastify';

/**
 * Health check route plugin
 * Provides a simple health check endpoint
 */
export async function healthRoutes(
  fastify: FastifyInstance,
  _opts: FastifyPluginOptions
): Promise<void> {
  /**
   * Health check endpoint - public (no authentication)
   * Returns the health status of the service
   */
  fastify.get('/health', async () => {
    return { status: 'ok' };
  });
}
