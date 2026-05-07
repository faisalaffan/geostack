import { existsSync } from 'node:fs';
import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

// Load .env.local if running locally (not in Docker)
if (existsSync('.env.local')) {
  loadDotenv({ path: '.env.local', override: true });
}

const envSchema = z.object({
  DATABASE_URL: z.string(),
  JWT_ISSUER: z.string().default('http://keycloak:8080/realms/geostack'),
  MINIO_ENDPOINT: z.string().default('minio'),
  MINIO_PORT: z.string().default('9000'),
  MINIO_ACCESS_KEY: z.string(),
  MINIO_SECRET_KEY: z.string(),
  MINIO_BUCKET: z.string().default('geostack-data'),
  MARTIN_URL: z.string().default('http://martin:3000'),
  TITILER_URL: z.string().default('http://titiler:3002'),
  GEOSERVER_URL: z.string().default('http://geoserver:8080'),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('0.0.0.0'),
});

export type Config = z.infer<typeof envSchema>;

export function loadConfig(): Config {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('Invalid environment:', result.error.format());
    process.exit(1);
  }
  return result.data;
}
