import { PoolClient } from 'pg';

export interface Dataset {
  id: string;
  name: string;
  type: 'point' | 'line' | 'polygon' | 'raster';
  geometry_column: string | null;
  feature_count: number;
  status: 'pending' | 'processing' | 'ready' | 'error';
  created_at: string;
  updated_at: string;
}

export async function listDatasets(client: PoolClient, schema: string): Promise<Dataset[]> {
  const result = await client.query(
    `SELECT id, name, type, geometry_column, feature_count, status, created_at, updated_at
     FROM ${schema}.datasets ORDER BY created_at DESC`,
  );
  return result.rows;
}

export async function getDataset(
  client: PoolClient, schema: string, id: string,
): Promise<Dataset | null> {
  const result = await client.query(
    `SELECT id, name, type, geometry_column, feature_count, status, created_at, updated_at
     FROM ${schema}.datasets WHERE id = $1`,
    [id],
  );
  return result.rows[0] || null;
}

export async function createDataset(
  client: PoolClient, schema: string, data: { name: string; type: string },
): Promise<Dataset> {
  const result = await client.query(
    `INSERT INTO ${schema}.datasets (name, type) VALUES ($1, $2) RETURNING *`,
    [data.name, data.type],
  );
  return result.rows[0];
}

export async function deleteDataset(
  client: PoolClient, schema: string, id: string,
): Promise<void> {
  await client.query(`DELETE FROM ${schema}.datasets WHERE id = $1`, [id]);
}

export async function updateDatasetStatus(
  client: PoolClient, schema: string, id: string, status: string, featureCount?: number,
): Promise<void> {
  await client.query(
    `UPDATE ${schema}.datasets SET status = $1, feature_count = COALESCE($3, feature_count) WHERE id = $2`,
    [status, id, featureCount],
  );
}

export async function queryFeatures(
  client: PoolClient, schema: string, datasetId: string, limit = 50, offset = 0,
) {
  const result = await client.query(
    `SELECT id, name, ST_AsGeoJSON(geom)::json as geometry, properties
     FROM ${schema}.layers WHERE dataset_id = $1
     ORDER BY id LIMIT $2 OFFSET $3`,
    [datasetId, limit, offset],
  );
  return result.rows.map((row: any) => ({
    id: row.id,
    type: 'Feature',
    geometry: row.geometry,
    properties: { name: row.name, ...row.properties },
  }));
}
