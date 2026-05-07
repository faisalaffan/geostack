import { FastifyRequest } from 'fastify';
import { withTenantClient } from '../../db/pool.js';
import { NotFoundError } from '../../lib/errors.js';
import * as repo from './datasets.repo.js';

export async function listDatasets(request: FastifyRequest) {
  return withTenantClient(request.tenantSlug, (client) =>
    repo.listDatasets(client, request.tenantSchema),
  );
}

export async function getDataset(request: FastifyRequest, id: string) {
  const dataset = await withTenantClient(request.tenantSlug, (client) =>
    repo.getDataset(client, request.tenantSchema, id),
  );
  if (!dataset) throw new NotFoundError('Dataset', id);
  return dataset;
}

export async function createDataset(request: FastifyRequest, body: { name: string; type: string }) {
  return withTenantClient(request.tenantSlug, (client) =>
    repo.createDataset(client, request.tenantSchema, body),
  );
}

export async function deleteDataset(request: FastifyRequest, id: string) {
  await withTenantClient(request.tenantSlug, async (client) => {
    const ds = await repo.getDataset(client, request.tenantSchema, id);
    if (!ds) throw new NotFoundError('Dataset', id);
    await repo.deleteDataset(client, request.tenantSchema, id);
  });
}

export async function getFeatures(request: FastifyRequest, datasetId: string, limit = 50, offset = 0) {
  return withTenantClient(request.tenantSlug, (client) =>
    repo.queryFeatures(client, request.tenantSchema, datasetId, limit, offset),
  );
}
