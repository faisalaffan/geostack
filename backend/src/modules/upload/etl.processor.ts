import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { writeFileSync } from 'node:fs';
import { Config } from '../../config.js';
import { getPool } from '../../db/pool.js';
import { uploadFile } from '../../lib/s3.js';

const execFileP = promisify(execFile);

interface EtlResult {
  featureCount: number;
  storagePath: string;
}

export async function runEtl(
  config: Config,
  tenantSlug: string,
  datasetId: string,
  fileBuffer: Buffer,
  fileName: string,
): Promise<EtlResult> {
  const schema = `tenant_${tenantSlug}`;
  const pool = getPool();

  await pool.query(
    `UPDATE ${schema}.datasets SET status = 'processing' WHERE id = $1`,
    [datasetId],
  );

  try {
    // Save raw file to MinIO
    const rawPath = `raw/${tenantSlug}/${datasetId}/${fileName}`;
    const mimeType = fileName.endsWith('.json') || fileName.endsWith('.geojson')
      ? 'application/json'
      : 'application/octet-stream';
    await uploadFile(config, rawPath, fileBuffer, mimeType);

    // Write temp file for GDAL processing
    const tmpDir = `/tmp/geostack-${datasetId}`;
    const tmpFile = `${tmpDir}/${fileName}`;
    await execFileP('mkdir', ['-p', tmpDir]);
    writeFileSync(tmpFile, fileBuffer);

    // Validate
    await execFileP('ogrinfo', ['-so', tmpFile]);

    // Transform & load via ogr2ogr
    await execFileP('ogr2ogr', [
      '-f', 'PostgreSQL',
      `PG:${config.DATABASE_URL}`,
      tmpFile,
      '-nln', `${schema}.layers`,
      '-lco', 'GEOMETRY_NAME=geom',
      '-lco', 'FID=id',
      '-t_srs', 'EPSG:4326',
      '-overwrite',
      '-nlt', 'GEOMETRY',
      '--config', 'PG_USE_COPY', 'YES',
    ]);

    // Count features
    const countResult = await pool.query(
      `SELECT COUNT(*) as count FROM ${schema}.layers`,
    );
    const featureCount = parseInt(countResult.rows[0].count, 10);

    // Update status
    await pool.query(
      `UPDATE ${schema}.datasets
       SET status = 'ready', feature_count = $1, storage_path = $2
       WHERE id = $3`,
      [featureCount, rawPath, datasetId],
    );

    await execFileP('rm', ['-rf', tmpDir]);

    return { featureCount, storagePath: rawPath };
  } catch (err: any) {
    await pool.query(
      `UPDATE ${schema}.datasets SET status = 'error' WHERE id = $1`,
      [datasetId],
    );
    throw err;
  }
}
