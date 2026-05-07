import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { Config } from '../config.js';
import { UnauthorizedError } from '../lib/errors.js';

interface AuthPluginOptions {
  config: Config;
}

interface JwtPayload {
  sub: string;
  realm_access?: { roles: string[] };
  org_id?: string;
  org_slug?: string;
  preferred_username?: string;
  email?: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    user: JwtPayload;
  }
}

async function authPlugin(app: FastifyInstance, opts: AuthPluginOptions) {
  app.decorateRequest('user', null as any);

  app.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    if (request.url === '/health' || request.url === '/api/v1/auth/login') {
      return;
    }

    try {
      const token = request.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        throw new UnauthorizedError('Missing authorization header');
      }

      const decoded = app.jwt.verify<JwtPayload>(token);
      request.user = decoded;
    } catch (err) {
      if (err instanceof UnauthorizedError) throw err;
      throw new UnauthorizedError('Invalid or expired token');
    }
  });
}

export default fp(authPlugin, { name: 'auth' });
