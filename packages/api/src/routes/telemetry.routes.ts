import type { FastifyInstance, FastifyPluginOptions, FastifyRequest, FastifyReply } from 'fastify';
import type { TelemetryService } from '../services/TelemetryService.js';

/**
 * Options for telemetry routes plugin
 */
export interface TelemetryRoutesOptions extends FastifyPluginOptions {
  telemetryService: TelemetryService;
  maxPayloadSize: number;
}

/**
 * Telemetry route plugin
 * Provides endpoints for submitting and retrieving telemetry data
 * Requires JWT authentication for all endpoints
 */
export async function telemetryRoutes(
  fastify: FastifyInstance,
  opts: TelemetryRoutesOptions
): Promise<void> {
  const { telemetryService, maxPayloadSize } = opts;

  /**
   * POST /api/v1/telemetry - Submit telemetry data (protected)
   * Requires JWT authentication
   * Buffers telemetry data for batch writing to the database
   * 
   * @param request - Fastify request with topic and payload in body
   * @param reply - Fastify reply object
   * @returns Success message or error
   */
  fastify.post('/api/v1/telemetry', {
    onRequest: [fastify.authenticateFlexible]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as { topic: string; payload: string; tenantId?: number } | undefined;
    const { topic, payload, tenantId } = body ?? {};
    
    // Stricter validation for empty strings
    if (
      typeof topic !== 'string' ||
      topic.trim().length === 0 ||
      typeof payload !== 'string' ||
      payload.trim().length === 0
    ) {
      reply.code(400).send({ error: 'topic and payload must be non-empty strings' });
      return;
    }

    // Determine tenantId: use from authenticated API key user or require in body for JWT users
    let effectiveTenantId: number;
    if (request.tenant) {
      // API key user - use their tenant automatically
      effectiveTenantId = request.tenant.id;
      
      // If tenantId provided in body, it must match authenticated tenant
      if (tenantId !== undefined && tenantId !== effectiveTenantId) {
        return reply.code(403).send({ 
          error: 'Forbidden',
          message: 'Cannot submit telemetry for a different tenant'
        });
      }
    } else {
      // JWT user - tenantId must be provided in body
      if (typeof tenantId !== 'number' || tenantId < 1) {
        return reply.code(400).send({ 
          error: 'tenantId is required in request body and must be a positive integer'
        });
      }
      effectiveTenantId = tenantId;
    }

    // Validate payload size to prevent memory exhaustion
    const payloadSize = Buffer.byteLength(payload, 'utf8');
    if (payloadSize > maxPayloadSize) {
      reply.code(400).send({ error: `payload size ${payloadSize} exceeds maximum ${maxPayloadSize} bytes` });
      return;
    }

    await telemetryService.addMessage(topic, payload, effectiveTenantId);
    
    return { success: true, message: 'Telemetry data buffered' };
  });

  /**
   * GET /api/v1/telemetry - Retrieve telemetry data (protected)
   * Requires JWT authentication
   * Supports pagination and filtering by topic
   * 
   * @param request - Fastify request with optional query parameters (topic, limit, offset)
   * @param reply - Fastify reply object
   * @returns Telemetry data with pagination metadata
   */
  fastify.get('/api/v1/telemetry', {
    onRequest: [fastify.authenticateFlexible]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as { topic?: string; limit?: string; offset?: string };
    
    const MAX_LIMIT = 1000;
    
    let limit = 100;
    if (query.limit !== undefined) {
      const parsedLimit = parseInt(query.limit, 10);
      if (Number.isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > MAX_LIMIT) {
        reply.code(400).send({ error: `limit must be an integer between 1 and ${MAX_LIMIT}` });
        return;
      }
      limit = parsedLimit;
    }

    let offset = 0;
    if (query.offset !== undefined) {
      const parsedOffset = parseInt(query.offset, 10);
      if (Number.isNaN(parsedOffset) || parsedOffset < 0) {
        reply.code(400).send({ error: 'offset must be a non-negative integer' });
        return;
      }
      offset = parsedOffset;
    }
    
    const repository = telemetryService.getRepository();
    
    // Fetch telemetry data using repository
    const telemetryData = await repository.findMany({
      topic: query.topic,
      limit,
      offset,
    });

    // Count total records
    const total = await repository.count(query.topic);

    return {
      data: telemetryData,
      pagination: {
        total,
        limit,
        offset,
      },
    };
  });
}
