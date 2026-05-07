import { describe, it, expect, vi } from 'vitest';

const mockPool = {
  query: vi.fn(),
  connect: vi.fn(),
};

vi.mock('../../src/db/pool.js', () => ({
  getPool: vi.fn(() => mockPool),
  withTenantClient: vi.fn(),
}));

describe('Datasets Repository', () => {
  it('listDatasets returns empty array when no data', async () => {
    const { withTenantClient } = await import('../../src/db/pool.js');
    vi.mocked(withTenantClient).mockImplementationOnce(async (_slug, fn) => {
      const c = { query: vi.fn().mockResolvedValue({ rows: [] }) };
      return fn(c);
    });

    const { listDatasets } = await import('../../src/modules/datasets/datasets.repo.js');
    const result = await withTenantClient('demo', (client: any) =>
      listDatasets(client, 'tenant_demo'),
    );
    expect(Array.isArray(result)).toBe(true);
  });

  it('createDataset inserts and returns a dataset', async () => {
    const { withTenantClient } = await import('../../src/db/pool.js');
    const mockRow = { id: 'ds-1', name: 'Test', type: 'point', status: 'pending' };

    vi.mocked(withTenantClient).mockImplementationOnce(async (_slug, fn) => {
      const c = { query: vi.fn().mockResolvedValue({ rows: [mockRow] }) };
      return fn(c);
    });

    const { createDataset } = await import('../../src/modules/datasets/datasets.repo.js');
    const result = await withTenantClient('demo', (client: any) =>
      createDataset(client, 'tenant_demo', { name: 'Test', type: 'point' }),
    );

    expect(result.name).toBe('Test');
    expect(result.type).toBe('point');
  });
});
