import { FastifyInstance } from 'fastify';
import { getUserFromToken } from './auth.service.js';

export async function authRoutes(app: FastifyInstance) {
  app.get('/login', async (request) => {
    const token = app.jwt.sign({
      sub: 'demo-user-id',
      preferred_username: 'demo_admin',
      email: 'admin@geostack.demo',
      org_id: 'd290f1ee-6c54-4b01-90e6-d701748f0851',
      org_slug: 'demo_telecom',
      realm_access: { roles: ['admin'] },
    }, { expiresIn: '8h' });

    return { token, token_type: 'Bearer', expires_in: 28800 };
  });

  app.get('/me', async (request) => {
    const userInfo = getUserFromToken(request);
    return userInfo;
  });
}
