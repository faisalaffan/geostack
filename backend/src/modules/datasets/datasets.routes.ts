import { FastifyInstance } from 'fastify';
import * as service from './datasets.service.js';
import { ValidationError } from '../../lib/errors.js';

export async function datasetRoutes(app: FastifyInstance) {
  app.get('/datasets', async (request) => {
    return service.listDatasets(request);
  });

  app.post('/datasets', async (request, reply) => {
    const body = request.body as any;
    if (!body.name || !body.type) {
      throw new ValidationError('name and type are required');
    }
    const dataset = await service.createDataset(request, body);
    reply.status(201);
    return dataset;
  });

  app.get('/datasets/:id', async (request) => {
    const { id } = request.params as { id: string };
    return service.getDataset(request, id);
  });

  app.delete('/datasets/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    await service.deleteDataset(request, id);
    reply.status(204);
  });

  app.get('/datasets/:id/features', async (request) => {
    const { id } = request.params as { id: string };
    const { limit, offset } = request.query as { limit?: number; offset?: number };
    return service.getFeatures(request, id, limit, offset);
  });
}
