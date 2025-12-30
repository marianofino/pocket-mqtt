import '@fastify/jwt';
import type { Tenant } from '../repositories/TenantRepository.interface.js';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    authenticateTenant: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }

  interface FastifyRequest {
    tenant?: Tenant;
  }
}
