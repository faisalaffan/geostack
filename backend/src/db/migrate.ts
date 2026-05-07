import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPool } from './pool.js';
import { loadConfig } from '../config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function migrate() {
  const config = loadConfig();
  const pool = getPool(config);

  const files = ['001_public_schema.sql', '002_tenant_template.sql'];

  for (const file of files) {
    const sql = readFileSync(join(__dirname, 'migrations', file), 'utf-8');
    console.log(`Running migration: ${file}`);
    await pool.query(sql);
    console.log(`  Done: ${file}`);
  }

  await pool.end();
  console.log('All migrations complete.');
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
