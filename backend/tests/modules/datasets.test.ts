import { describe, it, expect, vi } from 'vitest';

vi.mock('../../src/db/pool.js', () => ({
  getPool: vi.fn(() => ({
    query: vi.fn(),
    connect: vi.fn(),
  })),
  withTenantClient: vi.fn(async (_slug: string, fn: Function) => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({ rows: [] }),
    };
    return fn(mockClient);
  }),
}));

describe('Datasets Repository', () => {
  it('listDatasets returns empty array when no data', async () => {
    const { listDatasets } = await import('../../src/modules/datasets/datasets.repo.js');
    const { withTenantClient } = await import('../../src/db/pool.js');

    const result = await withTenantClient('demo', (client: any) =>
      listDatasets(client, 'tenant_demo'),
    );

    expect(Array.isArray(result)).toBe(true);
  });

  it('createDataset inserts and returns a dataset', async () => {
    const { createDataset } = await import('../../src/modules/datasets/datasets.repo.js');
    const { withTenantClient } = await import('../../src/db/pool.js');

    const mockRow = { id: 'ds-1', name: 'Test', type: 'point', status: 'pending' };
    const mockClient = {
      query: vi.fn().mockResolvedValueOnce({ rows: [mockRow] }),
    };

    const result = await withTenantClient('demo', (client: any) =>
      createDataset(client, 'tenant_demo', { name: 'Test', type: 'point' }),
    );

    expect(result.name).toBe('Test');
    expect(result.type).toBe('point');
  });
});
