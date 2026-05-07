import { describe, it, expect, vi } from 'vitest';

vi.mock('../../src/db/pool.js', () => ({
  getPool: vi.fn(() => ({ query: vi.fn().mockResolvedValue({ rows: [{ count: '5' }] }) })),
  withTenantClient: vi.fn(),
}));

vi.mock('../../src/lib/s3.js', () => ({
  getS3: vi.fn(),
  ensureBucket: vi.fn(),
  uploadFile: vi.fn().mockResolvedValue('raw/demo/ds-1/test.geojson'),
}));

vi.mock('node:child_process', () => ({
  execFile: vi.fn((_cmd: string, _args: string[], cb: Function) => {
    cb(null, { stdout: '', stderr: '' });
  }),
}));

vi.mock('node:fs', () => ({
  writeFileSync: vi.fn(),
}));

describe('ETL Processor', () => {
  it('handles GeoJSON upload successfully', async () => {
    const { runEtl } = await import('../../src/modules/upload/etl.processor.js');

    const mockConfig = {
      DATABASE_URL: 'postgres://localhost:5432/test',
      MINIO_ENDPOINT: 'minio',
      MINIO_PORT: '9000',
      MINIO_ACCESS_KEY: 'test',
      MINIO_SECRET_KEY: 'test',
      MINIO_BUCKET: 'test-bucket',
      JWT_ISSUER: 'http://test',
      MARTIN_URL: 'http://martin',
      TITILER_URL: 'http://titiler',
      GEOSERVER_URL: 'http://geoserver',
      PORT: 3000,
      HOST: '0.0.0.0',
    };

    const fileBuffer = Buffer.from(JSON.stringify({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [106.8, -6.6] },
          properties: {},
        },
      ],
    }));

    const result = await runEtl(mockConfig, 'demo', 'ds-1', fileBuffer, 'test.geojson');

    expect(result).toHaveProperty('featureCount');
    expect(result).toHaveProperty('storagePath');
    expect(result.storagePath).toBe('raw/demo/ds-1/test.geojson');
  });
});
