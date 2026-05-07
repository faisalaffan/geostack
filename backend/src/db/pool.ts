import { Pool, PoolClient } from 'pg';
import { Config } from '../config.js';

let pool: Pool;

export function getPool(config?: Config): Pool {
  if (!pool && config) {
    pool = new Pool({
      connectionString: config.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30000,
    });
  }
  return pool!;
}

export async function withTenantClient(
  tenantSlug: string,
  fn: (client: PoolClient) => Promise<unknown>,
): Promise<unknown> {
  const client = await pool.connect();
  try {
    await client.query(`SET search_path TO tenant_${tenantSlug}, public`);
    return await fn(client);
  } finally {
    client.release();
  }
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
  }
}
