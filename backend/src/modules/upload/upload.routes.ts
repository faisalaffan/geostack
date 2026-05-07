import { FastifyInstance } from 'fastify';
import { handleUpload } from './upload.service.js';
import { ValidationError } from '../../lib/errors.js';

export async function uploadRoutes(app: FastifyInstance) {
  app.post('/upload/:datasetId', async (request, reply) => {
    const { datasetId } = request.params as { datasetId: string };
    const file = await request.file();

    if (!file) {
      throw new ValidationError('No file uploaded');
    }

    const buffer = await file.toBuffer();
    const result = await handleUpload(request, datasetId, buffer, file.filename);
    reply.status(202);
    return result;
  });
}
