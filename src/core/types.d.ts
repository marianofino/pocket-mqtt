import '@fastify/jwt';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    authenticateTenant: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}
