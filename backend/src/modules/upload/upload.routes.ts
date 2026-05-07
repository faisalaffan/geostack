import { FastifyInstance } from 'fastify';
import { handleUpload } from './upload.service.js';
import { ValidationError } from '../../lib/errors.js';

// In-memory progress store (production would use Redis)
const progressStore = new Map<string, { step: string; percent: number }>();

export function getProgressStore() {
  return progressStore;
}

export async function uploadRoutes(app: FastifyInstance) {
  // WebSocket endpoint for real-time ETL progress
  app.get('/ws/etl/:datasetId', { websocket: true }, (socket, req) => {
    const { datasetId } = req.params as { datasetId: string };
    // @fastify/websocket v11 SocketStream wraps ws.WebSocket
    const ws = (socket as any).socket || socket;

    const interval = setInterval(() => {
      const progress = progressStore.get(datasetId);
      if (progress) {
        ws.send(JSON.stringify(progress));
        if (progress.percent >= 100) {
          progressStore.delete(datasetId);
          clearInterval(interval);
          ws.close();
        }
      }
    }, 500);

    ws.on('close', () => {
      clearInterval(interval);
    });
  });

  app.post('/upload/:datasetId', async (request, reply) => {
    const { datasetId } = request.params as { datasetId: string };
    const file = await request.file();

    if (!file) {
      throw new ValidationError('No file uploaded');
    }

    const buffer = await file.toBuffer();

    // Start async ETL with progress tracking
    const resultPromise = handleUpload(
      request,
      datasetId,
      buffer,
      file.filename,
      (step, percent) => {
        progressStore.set(datasetId, { step, percent });
      },
    );

    // Don't await — fire and forget, client polls via WebSocket
    resultPromise.catch((err) => {
      console.error('ETL failed:', err);
      progressStore.set(datasetId, { step: 'error', percent: 100 });
    });

    reply.status(202);
    return { jobId: datasetId, status: 'processing' };
  });
}
