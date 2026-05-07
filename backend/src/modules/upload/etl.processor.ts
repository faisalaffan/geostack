import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { writeFileSync } from 'node:fs';
import { Config } from '../../config.js';
import { getPool } from '../../db/pool.js';
import { uploadFile } from '../../lib/s3.js';

const execFileP = promisify(execFile);

export type ProgressCallback = (step: string, percent: number) => void;

function parseDbUrl(url: string): string {
  // postgres://user:pass@host:port/dbname → GDAL PG: format
  const u = new URL(url);
  return `PG:dbname='${u.pathname.slice(1)}' host='${u.hostname}' port='${u.port || '5432'}' user='${u.username}' password='${u.password}'`;
}

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
  onProgress?: ProgressCallback,
): Promise<EtlResult> {
  const schema = `tenant_${tenantSlug}`;
  const pool = getPool();

  const progress = (step: string, percent: number) => {
    onProgress?.(step, percent);
  };

  progress('validating', 10);
  await pool.query(
    `UPDATE ${schema}.datasets SET status = 'processing' WHERE id = $1`,
    [datasetId],
  );

  try {
    // Save raw file to MinIO
    progress('uploading', 20);
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
    progress('validating', 30);
    await execFileP('ogrinfo', ['-so', tmpFile]);

    // Transform & load via ogr2ogr — first into staging, then merge
    progress('transforming', 50);
    const stagingTable = `${schema}.layers_staging`;

    // Drop staging if exists and import
    await pool.query(`DROP TABLE IF EXISTS ${stagingTable}`);

    await execFileP('ogr2ogr', [
      '-f', 'PostgreSQL',
      parseDbUrl(config.DATABASE_URL),
      tmpFile,
      '-nln', stagingTable,
      '-lco', 'GEOMETRY_NAME=geom',
      '-t_srs', 'EPSG:4326',
      '-nlt', 'GEOMETRY',
      '--config', 'PG_USE_COPY', 'YES',
    ]);

    // Merge staging into layers: map staging columns → layers columns
    // ogr2ogr puts GeoJSON properties as columns; we store them in JSONB
    const columns = await pool.query(
      `SELECT column_name FROM information_schema.columns WHERE table_schema = $1 AND table_name = 'layers_staging'`,
      [schema],
    );
    const colNames = columns.rows.map((r: any) => r.column_name);
    const propCols = colNames.filter((c: string) => !['ogc_fid', 'geom', 'id'].includes(c));
    const propsJson = propCols.map((c: string) => `'${c}', ${c}`).join(', ');

    await pool.query(`
      INSERT INTO ${schema}.layers (dataset_id, name, geom, properties)
      SELECT $1, COALESCE(name, ''), geom, jsonb_strip_nulls(jsonb_build_object(${propsJson || "'_', ''"}))
      FROM ${stagingTable}
    `, [datasetId]);

    await pool.query(`DROP TABLE IF EXISTS ${stagingTable}`);

    // Count features
    progress('finalizing', 90);
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

    progress('done', 100);

    return { featureCount, storagePath: rawPath };
  } catch (err: any) {
    progress('error', 100);
    await pool.query(
      `UPDATE ${schema}.datasets SET status = 'error' WHERE id = $1`,
      [datasetId],
    );
    throw err;
  }
}
