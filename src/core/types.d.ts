import '@fastify/jwt';
import type { Tenant } from '../repositories/TenantRepository.interface.js';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    authenticateFlexible: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }

  interface FastifyRequest {
    tenant?: Tenant;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      tenantId?: number;
      userId?: number;
      username?: string;
    };
    user: {
      tenantId?: number;
      userId?: number;
      username?: string;
    };
  }
}
