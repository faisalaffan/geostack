import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import { Config } from './config.js';
import { getPool, closePool } from './db/pool.js';
import { ensureBucket, getS3 } from './lib/s3.js';
import { AppError } from './lib/errors.js';
import tenantPlugin from './plugins/tenant.js';
import authPlugin from './plugins/auth.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { datasetRoutes } from './modules/datasets/datasets.routes.js';
import { uploadRoutes } from './modules/upload/upload.routes.js';
import { tileRoutes } from './modules/tiles/tiles.routes.js';

export async function buildApp(config: Config) {
  const app = Fastify({ logger: { transport: { target: 'pino-pretty' } } });
  app.decorate('config', config);

  // Init connections
  getPool(config);
  getS3(config);
  await ensureBucket(config);

  // Plugins
  await app.register(cors, { origin: true, credentials: true });
  await app.register(jwt, { secret: process.env.JWT_SECRET || 'dev-secret-change-me' });
  await app.register(multipart, { limits: { fileSize: 100 * 1024 * 1024 } }); // 100MB
  await app.register(rateLimit, { max: 100, timeWindow: '1 minute' });

  // Custom plugins
  await app.register(tenantPlugin);
  await app.register(authPlugin, { config });

  // Routes
  await app.register(authRoutes, { prefix: '/api/v1/auth' });
  await app.register(datasetRoutes, { prefix: '/api/v1' });
  await app.register(uploadRoutes, { prefix: '/api/v1' });
  await app.register(tileRoutes, { prefix: '/api/v1' });

  // Health check
  app.get('/health', async () => ({ status: 'ok' }));

  // Error handler
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      reply.status(error.statusCode).send({
        error: error.code,
        message: error.message,
      });
      return;
    }
    app.log.error(error);
    reply.status(500).send({
      error: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    });
  });

  app.addHook('onClose', async () => {
    await closePool();
  });

  return app;
}
