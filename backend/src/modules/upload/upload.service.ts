import { FastifyRequest } from 'fastify';
import { Config } from '../../config.js';
import { withTenantClient } from '../../db/pool.js';
import * as datasetRepo from '../datasets/datasets.repo.js';
import { NotFoundError } from '../../lib/errors.js';
import { runEtl } from './etl.processor.js';

export async function handleUpload(
  request: FastifyRequest,
  datasetId: string,
  fileBuffer: Buffer,
  fileName: string,
): Promise<{ jobId: string }> {
  const config = (request as any).server.config as Config;

  await withTenantClient(request.tenantSlug, async (client) => {
    const ds = await datasetRepo.getDataset(client, request.tenantSchema, datasetId);
    if (!ds) throw new NotFoundError('Dataset', datasetId);
  });

  const result = await runEtl(config, request.tenantSlug, datasetId, fileBuffer, fileName);

  return { jobId: datasetId, ...result };
}
