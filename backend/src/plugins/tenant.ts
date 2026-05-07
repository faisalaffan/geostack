import { FastifyInstance, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';

declare module 'fastify' {
  interface FastifyRequest {
    tenantSlug: string;
    tenantSchema: string;
  }
}

async function tenantPlugin(app: FastifyInstance) {
  app.decorateRequest('tenantSlug', '');
  app.decorateRequest('tenantSchema', '');

  app.addHook('preHandler', async (request: FastifyRequest) => {
    const orgSlug = (request.user as any)?.org_slug;
    if (orgSlug) {
      request.tenantSlug = orgSlug;
      request.tenantSchema = `tenant_${orgSlug}`;
    }
  });
}

export default fp(tenantPlugin, { name: 'tenant' });
