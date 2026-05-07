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

async function authPlugin(app: FastifyInstance, opts: AuthPluginOptions) {

  app.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    if (
      request.url === '/health' ||
      request.url === '/api/v1/auth/login' ||
      request.url.startsWith('/api/v1/ws/')
    ) {
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
