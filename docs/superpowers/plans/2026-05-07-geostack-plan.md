# Geostack Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a multi-tenant geospatial data platform with ETL pipeline, tile serving, and map visualization.

**Architecture:** Monorepo with backend (Fastify), frontend (React/Vite), and 8 Docker Compose services. Modular monolith backend with per-tenant PostgreSQL schemas. Tile serving via Martin/TiTiler/GeoServer proxy. Auth via Keycloak OIDC.

**Tech Stack:** Node.js 22, TypeScript, Fastify, PostgreSQL/PostGIS, React 19, MapLibre GL JS, react-map-gl, Tailwind CSS, Docker Compose

**Constraint:** Do NOT run servers, Docker, or tests. Code only. User will run on their VPS.

---

## File Structure

```
geostack/
├── docker-compose.yml
├── .env.example
├── .gitignore
├── CLAUDE.md
├── README.md
├── docker/
│   ├── backend.Dockerfile
│   ├── frontend.Dockerfile
│   └── init/
│       ├── 01_extensions.sql
│       ├── 02_seed.sql
│       └── 03_realm.json
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vitest.config.ts
│   └── src/
│       ├── app.ts
│       ├── config.ts
│       ├── server.ts
│       ├── plugins/
│       │   ├── tenant.ts
│       │   └── auth.ts
│       ├── modules/
│       │   ├── auth/
│       │   │   ├── auth.routes.ts
│       │   │   └── auth.service.ts
│       │   ├── datasets/
│       │   │   ├── datasets.routes.ts
│       │   │   ├── datasets.service.ts
│       │   │   └── datasets.repo.ts
│       │   ├── upload/
│       │   │   ├── upload.routes.ts
│       │   │   ├── upload.service.ts
│       │   │   └── etl.processor.ts
│       │   └── tiles/
│       │       └── tiles.routes.ts
│       ├── db/
│       │   ├── pool.ts
│       │   └── migrations/
│       │       ├── 001_public_schema.sql
│       │       └── 002_tenant_template.sql
│       └── lib/
│           ├── errors.ts
│           └── s3.ts
├── frontend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── pages/
│       │   ├── Login.tsx
│       │   ├── Dashboard.tsx
│       │   ├── DatasetDetail.tsx
│       │   └── MapView.tsx
│       ├── components/
│       │   ├── map/
│       │   │   ├── MapContainer.tsx
│       │   │   ├── LayerControl.tsx
│       │   │   ├── BaselineLayer.tsx
│       │   │   ├── VectorLayer.tsx
│       │   │   ├── RasterLayer.tsx
│       │   │   └── PopupCard.tsx
│       │   ├── datasets/
│       │   │   ├── DatasetList.tsx
│       │   │   ├── DatasetUpload.tsx
│       │   │   └── DatasetTable.tsx
│       │   └── shared/
│       │       ├── Layout.tsx
│       │       ├── AuthGuard.tsx
│       │       └── StatusBadge.tsx
│       ├── hooks/
│       │   ├── useAuth.ts
│       │   ├── useDatasets.ts
│       │   └── useMap.ts
│       ├── lib/
│       │   ├── api.ts
│       │   └── keycloak.ts
│       └── styles/
│           └── index.css
└── docs/
    └── superpowers/
        ├── specs/
        │   └── 2026-05-07-geostack-design.md
        └── plans/
            └── 2026-05-07-geostack-plan.md
```

---

### Task 1: Project Scaffold — Root Config Files

**Files:**
- Create: `.gitignore`
- Create: `.env.example`
- Create: `CLAUDE.md`
- Create: `README.md`

- [ ] **Step 1: Write .gitignore**

```bash
cat > /Users/faisalaffan/geostack/.gitignore << 'GITIGNORE'
node_modules/
dist/
.env
*.log
.DS_Store
.vite/
coverage/
*.local
tmp/
data/
GITIGNORE
```

- [ ] **Step 2: Write .env.example**

```bash
cat > /Users/faisalaffan/geostack/.env.example << 'ENV'
# PostgreSQL
POSTGRES_USER=geostack
POSTGRES_PASSWORD=geostack_dev
POSTGRES_DB=geostack
POSTGRES_PORT=5432

# Backend API
API_PORT=3000
JWT_ISSUER=http://keycloak:8081/realms/geostack

# MinIO
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin
MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_BUCKET=geostack-data

# Keycloak
KEYCLOAK_ADMIN=admin
KEYCLOAK_ADMIN_PASSWORD=admin
KEYCLOAK_REALM=geostack
KEYCLOAK_CLIENT_ID=geostack-api

# Martin
DATABASE_URL=postgres://geostack:geostack_dev@postgres:5432/geostack

# Frontend
VITE_API_URL=http://localhost:3000
VITE_KEYCLOAK_URL=http://localhost:8081
VITE_KEYCLOAK_REALM=geostack
VITE_KEYCLOAK_CLIENT_ID=geostack-web
ENV
```

- [ ] **Step 3: Write CLAUDE.md**

```bash
cat > /Users/faisalaffan/geostack/CLAUDE.md << 'CLAUDE'
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

```bash
# Infrastructure
docker compose up -d              # Start all services
docker compose down               # Stop all services
docker compose logs -f <service>  # Follow logs for a service

# Backend
docker compose exec api npm run db:migrate    # Run database migrations
docker compose exec api npm test             # Run backend tests
docker compose exec api npm run dev          # Dev server (already running in container)

# Frontend
docker compose exec web npm run dev          # Vite dev server (already running in container)
docker compose exec web npm test             # Run frontend tests
```

## Architecture

Monorepo with modular monolith backend. 8 Docker Compose services: React/Vite frontend (:5173), Fastify API (:3000), PostgreSQL/PostGIS (:5432), Martin vector tiles (:3001), TiTiler raster tiles (:3002), GeoServer (:8080), Keycloak (:8081), MinIO (:9000).

### Multi-Tenancy
- Per-organization PostgreSQL schema (`tenant_<slug>`)
- `public` schema for shared tables (organizations, users)
- Keycloak realm per organization
- JWT contains `realm` and `org_id` → middleware resolves tenant schema

### Backend Module Boundaries
| Module | Responsibility |
|--------|---------------|
| `auth` | JWT validation from Keycloak, user/org info |
| `datasets` | CRUD datasets, layer management |
| `upload` | Multipart upload, ETL orchestration |
| `tiles` | Proxy to Martin/TiTiler/GeoServer with auth |
| `tenant` | Organization provisioning, schema management |

### Database
- PostgreSQL 16 + PostGIS 3.4
- Per-tenant schemas for data isolation
- JSONB for flexible spatial properties
- GDAL CLI (`ogr2ogr`, `ogrinfo`) for ETL processing

### Tile Pipeline
MapLibre GL (browser) → API proxy (/tiles/...) → Martin/TiTiler/GeoServer → PostGIS
CLAUDE
```

- [ ] **Step 4: Write README.md**

```bash
cat > /Users/faisalaffan/geostack/README.md << 'README'
# Geostack

Multi-tenant geospatial data platform — portfolio project for fullstack engineering roles in the GIS/telecommunications domain.

## Stack

- **Backend:** Node.js 22, TypeScript, Fastify
- **Frontend:** React 19, MapLibre GL JS, react-map-gl, Tailwind CSS
- **Database:** PostgreSQL 16 + PostGIS 3.4
- **Tile Services:** Martin (vector), TiTiler (raster), GeoServer (OGC)
- **Auth:** Keycloak OIDC
- **Storage:** MinIO (S3-compatible)
- **Infra:** Docker Compose

## Quick Start

```bash
cp .env.example .env
docker compose up -d
docker compose exec api npm run db:migrate
```

Open http://localhost:5173 in your browser.

## Services

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| API | http://localhost:3000 |
| MinIO Console | http://localhost:9001 |
| Keycloak Admin | http://localhost:8081/admin |
| GeoServer | http://localhost:8080/geoserver |
README
```

- [ ] **Step 5: Commit**

```bash
git add .gitignore .env.example CLAUDE.md README.md
git commit -m "chore: scaffold root config files"
```

---

### Task 2: Docker Infrastructure — Dockerfiles

**Files:**
- Create: `docker/backend.Dockerfile`
- Create: `docker/frontend.Dockerfile`
- Create: `docker/init/01_extensions.sql`
- Create: `docker/init/02_seed.sql`

- [ ] **Step 1: Write backend Dockerfile**

```bash
mkdir -p /Users/faisalaffan/geostack/docker/init

cat > /Users/faisalaffan/geostack/docker/backend.Dockerfile << 'DOCKERFILE'
FROM node:22-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    gdal-bin \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY backend/package*.json ./
RUN npm ci
COPY backend/ .
EXPOSE 3000
CMD ["npm", "run", "dev"]
DOCKERFILE
```

- [ ] **Step 2: Write frontend Dockerfile**

```bash
cat > /Users/faisalaffan/geostack/docker/frontend.Dockerfile << 'DOCKERFILE'
FROM node:22-slim

WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
DOCKERFILE
```

- [ ] **Step 3: Write PostGIS init scripts**

01_extensions.sql:
```sql
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
```

02_seed.sql:
```sql
-- public.organizations
INSERT INTO public.organizations (id, name, slug, keycloak_realm_id)
VALUES (
  'd290f1ee-6c54-4b01-90e6-d701748f0851',
  'Demo Telecom',
  'demo_telecom',
  'geostack'
) ON CONFLICT DO NOTHING;

INSERT INTO public.users (id, keycloak_user_id, organization_id, role)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'demo-user-id',
  'd290f1ee-6c54-4b01-90e6-d701748f0851',
  'admin'
) ON CONFLICT DO NOTHING;

-- Create demo tenant schema
CREATE SCHEMA IF NOT EXISTS tenant_demo_telecom;

-- Sample cell towers
CREATE TABLE IF NOT EXISTS tenant_demo_telecom.layers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id UUID,
  name TEXT,
  geom GEOMETRY(POINT, 4326),
  properties JSONB
);
CREATE INDEX IF NOT EXISTS idx_layers_geom ON tenant_demo_telecom.layers USING GIST (geom);

-- Seed sample data: cell towers in Indonesia
INSERT INTO tenant_demo_telecom.layers (name, geom, properties)
VALUES
  ('Tower BTK-001', ST_SetSRID(ST_MakePoint(106.8272, -6.5971), 4326), '{"type": "macrocell", "height_m": 45, "band": "LTE1800", "status": "active"}'),
  ('Tower BTK-002', ST_SetSRID(ST_MakePoint(106.8136, -6.5895), 4326), '{"type": "microcell", "height_m": 15, "band": "LTE2100", "status": "active"}'),
  ('Tower BTK-003', ST_SetSRID(ST_MakePoint(106.8412, -6.6032), 4326), '{"type": "macrocell", "height_m": 60, "band": "NR3500", "status": "planned"}'),
  ('Tower BTK-004', ST_SetSRID(ST_MakePoint(106.7950, -6.6150), 4326), '{"type": "smallcell", "height_m": 8, "band": "LTE2600", "status": "active"}'),
  ('Tower BTK-005', ST_SetSRID(ST_MakePoint(106.8500, -6.5800), 4326), '{"type": "macrocell", "height_m": 50, "band": "NR3500", "status": "active"}');

-- Sample fiber routes
INSERT INTO tenant_demo_telecom.layers (name, geom, properties)
VALUES
  ('Fiber Route A', ST_SetSRID(ST_GeomFromText('LINESTRING(106.827 -6.597, 106.813 -6.589, 106.795 -6.615)'), 4326), '{"type": "backbone", "length_km": 3.2, "capacity_gbps": 100, "status": "active"}'),
  ('Fiber Route B', ST_SetSRID(ST_GeomFromText('LINESTRING(106.841 -6.603, 106.850 -6.580, 106.827 -6.597)'), 4326), '{"type": "distribution", "length_km": 4.8, "capacity_gbps": 40, "status": "active"}');
```

- [ ] **Step 4: Commit**

```bash
git add docker/
git commit -m "chore: add Dockerfiles and DB init scripts"
```

---

### Task 3: Docker Compose

**Files:**
- Create: `docker-compose.yml`

- [ ] **Step 1: Write docker-compose.yml**

```yaml
version: "3.8"

services:
  postgres:
    image: postgis/postgis:16-3.4
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-geostack}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-geostack_dev}
      POSTGRES_DB: ${POSTGRES_DB:-geostack}
    ports:
      - "${POSTGRES_PORT:-5432}:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./docker/init:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-geostack}"]
      interval: 5s
      timeout: 5s
      retries: 5

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER:-minioadmin}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD:-minioadmin}
    ports:
      - "${MINIO_PORT:-9000}:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 10s
      timeout: 5s
      retries: 5

  keycloak:
    image: quay.io/keycloak/keycloak:25
    environment:
      KC_BOOTSTRAP_ADMIN_USERNAME: ${KEYCLOAK_ADMIN:-admin}
      KC_BOOTSTRAP_ADMIN_PASSWORD: ${KEYCLOAK_ADMIN_PASSWORD:-admin}
      JAVA_OPTS: "-Xms128m -Xmx384m"
    ports:
      - "8081:8080"
    command: start-dev
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 15s
      timeout: 5s
      retries: 10

  api:
    build:
      context: .
      dockerfile: docker/backend.Dockerfile
    ports:
      - "${API_PORT:-3000}:3000"
    environment:
      DATABASE_URL: postgres://${POSTGRES_USER:-geostack}:${POSTGRES_PASSWORD:-geostack_dev}@postgres:5432/${POSTGRES_DB:-geostack}
      JWT_ISSUER: ${JWT_ISSUER:-http://keycloak:8080/realms/geostack}
      MINIO_ENDPOINT: ${MINIO_ENDPOINT:-minio}
      MINIO_PORT: ${MINIO_PORT:-9000}
      MINIO_ACCESS_KEY: ${MINIO_ROOT_USER:-minioadmin}
      MINIO_SECRET_KEY: ${MINIO_ROOT_PASSWORD:-minioadmin}
      MINIO_BUCKET: ${MINIO_BUCKET:-geostack-data}
      MARTIN_URL: http://martin:3000
      TITILER_URL: http://titiler:3002
      GEOSERVER_URL: http://geoserver:8080
    volumes:
      - ./backend/src:/app/src
    depends_on:
      postgres:
        condition: service_healthy
      minio:
        condition: service_healthy
      keycloak:
        condition: service_healthy

  web:
    build:
      context: .
      dockerfile: docker/frontend.Dockerfile
    ports:
      - "5173:5173"
    environment:
      VITE_API_URL: http://localhost:3000
      VITE_KEYCLOAK_URL: http://localhost:8081
      VITE_KEYCLOAK_REALM: ${KEYCLOAK_REALM:-geostack}
      VITE_KEYCLOAK_CLIENT_ID: geostack-web
    volumes:
      - ./frontend/src:/app/src
    depends_on:
      - api

  martin:
    image: ghcr.io/maplibre/martin:latest
    environment:
      DATABASE_URL: postgres://${POSTGRES_USER:-geostack}:${POSTGRES_PASSWORD:-geostack_dev}@postgres:5432/${POSTGRES_DB:-geostack}
    ports:
      - "3001:3000"
    depends_on:
      postgres:
        condition: service_healthy

  titiler:
    image: ghcr.io/developmentseed/titiler:latest
    environment:
      WORKERS_PER_CORE: 1
      MAX_THREADS: 2
    ports:
      - "3002:8080"

  geoserver:
    image: docker.osgeo.org/geoserver:2.25.2
    environment:
      JAVA_OPTS: "-Xms128m -Xmx512m"
      INSTALL_EXTENSIONS: "true"
      STABLE_EXTENSIONS: ""
      EXTRA_LIBS_URL: ""
    ports:
      - "8080:8080"
    volumes:
      - geoserver_data:/opt/geoserver/data

volumes:
  pgdata:
  minio_data:
  geoserver_data:
```

- [ ] **Step 2: Commit**

```bash
git add docker-compose.yml
git commit -m "chore: add Docker Compose with 8 services"
```

---

### Task 4: Backend Setup — package.json, tsconfig, config

**Files:**
- Create: `backend/package.json`
- Create: `backend/tsconfig.json`
- Create: `backend/vitest.config.ts`
- Create: `backend/src/config.ts`
- Create: `backend/src/server.ts`

- [ ] **Step 1: Write backend package.json**

```bash
mkdir -p /Users/faisalaffan/geostack/backend/src/{plugins,modules/{auth,datasets,upload,tiles},db/migrations,lib}
mkdir -p /Users/faisalaffan/geostack/backend/tests/{plugins,modules,helpers}
```

package.json:
```json
{
  "name": "geostack-api",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "db:migrate": "tsx src/db/migrate.ts"
  },
  "dependencies": {
    "fastify": "^5.2.0",
    "@fastify/cors": "^10.0.0",
    "@fastify/jwt": "^9.0.0",
    "@fastify/multipart": "^9.0.0",
    "@fastify/rate-limit": "^10.0.0",
    "@fastify/http-proxy": "^10.0.0",
    "pg": "^8.13.0",
    "minio": "^8.0.0",
    "pino": "^9.0.0",
    "pino-pretty": "^13.0.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/pg": "^8.11.0",
    "tsx": "^4.19.0",
    "typescript": "^5.7.0",
    "vitest": "^3.0.0",
    "testcontainers": "^10.0.0"
  }
}
```

- [ ] **Step 2: Write tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "strict": true,
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [ ] **Step 3: Write vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/setup.ts'],
  },
});
```

- [ ] **Step 4: Write src/config.ts**

```typescript
import { z } from 'zod';

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
```

- [ ] **Step 5: Write src/server.ts**

```typescript
import { buildApp } from './app.js';
import { loadConfig } from './config.js';

const config = loadConfig();

async function main() {
  const app = await buildApp(config);

  try {
    await app.listen({ port: config.PORT, host: config.HOST });
    app.log.info(`Server running on port ${config.PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
```

- [ ] **Step 6: Write tests/setup.ts**

No content needed — empty setup file. Reserved for testcontainers or global mocks later.

- [ ] **Step 7: Commit**

```bash
git add backend/package.json backend/tsconfig.json backend/vitest.config.ts backend/src/config.ts backend/src/server.ts backend/tests/setup.ts
git commit -m "chore: scaffold backend with Fastify + TypeScript"
```

---

### Task 5: Backend Core — App, DB Pool, Errors, S3

**Files:**
- Create: `backend/src/app.ts`
- Create: `backend/src/db/pool.ts`
- Create: `backend/src/lib/errors.ts`
- Create: `backend/src/lib/s3.ts`

- [ ] **Step 1: Write src/db/pool.ts**

```typescript
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
```

- [ ] **Step 2: Write src/lib/errors.ts**

```typescript
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_ERROR',
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super(`${resource} with id ${id} not found`, 404, 'NOT_FOUND');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}
```

- [ ] **Step 3: Write src/lib/s3.ts**

```typescript
import { Client as MinioClient } from 'minio';
import { Config } from '../config.js';

let minio: MinioClient;

export function getS3(config?: Config): MinioClient {
  if (!minio && config) {
    minio = new MinioClient({
      endPoint: config.MINIO_ENDPOINT,
      port: parseInt(config.MINIO_PORT, 10),
      accessKey: config.MINIO_ACCESS_KEY,
      secretKey: config.MINIO_SECRET_KEY,
      useSSL: false,
    });
  }
  return minio!;
}

export async function ensureBucket(config: Config): Promise<void> {
  const client = getS3(config);
  const exists = await client.bucketExists(config.MINIO_BUCKET);
  if (!exists) {
    await client.makeBucket(config.MINIO_BUCKET);
  }
}

export async function uploadFile(
  config: Config,
  objectName: string,
  buffer: Buffer,
  contentType: string,
): Promise<string> {
  const client = getS3(config);
  await client.putObject(config.MINIO_BUCKET, objectName, buffer, buffer.length, {
    'Content-Type': contentType,
  });
  return objectName;
}
```

- [ ] **Step 4: Write src/app.ts**

```typescript
import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import { Config } from './config.js';
import { getPool, closePool } from './db/pool.js';
import { ensureBucket, getS3 } from './lib/s3.js';
import { AppError } from './lib/errors.js';
import { tenantPlugin } from './plugins/tenant.js';
import { authPlugin } from './plugins/auth.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { datasetRoutes } from './modules/datasets/datasets.routes.js';
import { uploadRoutes } from './modules/upload/upload.routes.js';
import { tileRoutes } from './modules/tiles/tiles.routes.js';

export async function buildApp(config: Config) {
  const app = Fastify({ logger: { transport: { target: 'pino-pretty' } } });

  // Init connections
  getPool(config);
  getS3(config);
  await ensureBucket(config);

  // Plugins
  await app.register(cors, { origin: true, credentials: true });
  await app.register(jwt, { secret: process.env.JWT_SECRET || 'dev-secret-change-me' });
  await app.register(multipart, { limits: { fileSize: 100 * 1024 * 1024 } }); // 100MB
  await app.register(rateLimit, { max: 100, timeWindow: '1 minute' });

  // Custom plugins
  await app.register(tenantPlugin);
  await app.register(authPlugin, { config });

  // Routes
  await app.register(authRoutes, { prefix: '/api/v1/auth' });
  await app.register(datasetRoutes, { prefix: '/api/v1' });
  await app.register(uploadRoutes, { prefix: '/api/v1' });
  await app.register(tileRoutes, { prefix: '/api/v1' });

  // Health check
  app.get('/health', async () => ({ status: 'ok' }));

  // Error handler
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      reply.status(error.statusCode).send({
        error: error.code,
        message: error.message,
      });
      return;
    }
    app.log.error(error);
    reply.status(500).send({
      error: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    });
  });

  app.addHook('onClose', async () => {
    await closePool();
  });

  return app;
}
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/app.ts backend/src/db/pool.ts backend/src/lib/errors.ts backend/src/lib/s3.ts
git commit -m "feat: add Fastify app setup, DB pool, S3 client, error classes"
```

---

### Task 6: Backend Plugins — Auth & Tenant Middleware

**Files:**
- Create: `backend/src/plugins/tenant.ts`
- Create: `backend/src/plugins/auth.ts`

- [ ] **Step 1: Write tenant plugin**

```typescript
import { FastifyInstance, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';

declare module 'fastify' {
  interface FastifyRequest {
    tenantSlug: string;
    tenantSchema: string;
  }
}

async function tenantPlugin(app: FastifyInstance) {
  app.decorateRequest('tenantSlug', '');
  app.decorateRequest('tenantSchema', '');

  app.addHook('preHandler', async (request: FastifyRequest) => {
    const orgSlug = (request.user as any)?.org_slug;
    if (orgSlug) {
      request.tenantSlug = orgSlug;
      request.tenantSchema = `tenant_${orgSlug}`;
    }
  });
}

export default fp(tenantPlugin, { name: 'tenant' });
```

Note: `fastify-plugin` is used to share the decorator across scopes. Install `fastify-plugin`:

- [ ] **Step 2: Write auth plugin**

```typescript
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { Config } from '../config.js';
import { UnauthorizedError } from '../lib/errors.js';

interface AuthPluginOptions {
  config: Config;
}

interface JwtPayload {
  sub: string;
  realm_access?: { roles: string[] };
  org_id?: string;
  org_slug?: string;
  preferred_username?: string;
  email?: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    user: JwtPayload;
  }
}

async function authPlugin(app: FastifyInstance, opts: AuthPluginOptions) {
  app.decorateRequest('user', null as any);

  app.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    // Skip auth for health check and login
    if (request.url === '/health' || request.url === '/api/v1/auth/login') {
      return;
    }

    try {
      const token = request.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        throw new UnauthorizedError('Missing authorization header');
      }

      const decoded = app.jwt.verify<JwtPayload>(token);
      request.user = decoded;
    } catch (err) {
      if (err instanceof UnauthorizedError) throw err;
      throw new UnauthorizedError('Invalid or expired token');
    }
  });
}

export default fp(authPlugin, { name: 'auth' });
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/plugins/tenant.ts backend/src/plugins/auth.ts
git commit -m "feat: add auth and tenant middleware plugins"
```

---

### Task 7: Backend — Auth Module

**Files:**
- Create: `backend/src/modules/auth/auth.service.ts`
- Create: `backend/src/modules/auth/auth.routes.ts`

- [ ] **Step 1: Write auth.service.ts**

```typescript
import { FastifyRequest } from 'fastify';

interface UserInfo {
  id: string;
  username: string;
  email: string;
  organizationId: string;
  organizationName: string;
  role: string;
}

export function getUserFromToken(request: FastifyRequest): UserInfo {
  const user = request.user;
  return {
    id: user.sub,
    username: user.preferred_username || '',
    email: user.email || '',
    organizationId: user.org_id || '',
    organizationName: user.org_slug || '',
    role: user.realm_access?.roles?.includes('admin') ? 'admin' : 'viewer',
  };
}
```

- [ ] **Step 2: Write auth.routes.ts**

```typescript
import { FastifyInstance } from 'fastify';
import { getUserFromToken } from './auth.service.js';

export async function authRoutes(app: FastifyInstance) {
  app.get('/login', async (request) => {
    // In dev mode, generate a mock JWT if no Keycloak is available.
    // In production, this would be a redirect to Keycloak.
    const token = app.jwt.sign({
      sub: 'demo-user-id',
      preferred_username: 'demo_admin',
      email: 'admin@geostack.demo',
      org_id: 'd290f1ee-6c54-4b01-90e6-d701748f0851',
      org_slug: 'demo_telecom',
      realm_access: { roles: ['admin'] },
    }, { expiresIn: '8h' });

    return { token, token_type: 'Bearer', expires_in: 28800 };
  });

  app.get('/me', async (request) => {
    const userInfo = getUserFromToken(request);
    return userInfo;
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/modules/auth/
git commit -m "feat: add auth module with login and user info"
```

---

### Task 8: Backend — Database Migrations

**Files:**
- Create: `backend/src/db/migrations/001_public_schema.sql`
- Create: `backend/src/db/migrations/002_tenant_template.sql`
- Create: `backend/src/db/migrate.ts`

- [ ] **Step 1: Write 001_public_schema.sql**

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  keycloak_realm_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  keycloak_user_id TEXT NOT NULL UNIQUE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'editor', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

- [ ] **Step 2: Write 002_tenant_template.sql**

```sql
-- Template per-tenant tables.
-- Call as: CREATE SCHEMA tenant_<slug>; then run these CREATE TABLE statements there.

CREATE TABLE IF NOT EXISTS datasets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('point', 'line', 'polygon', 'raster')),
  geometry_column TEXT,
  bbox GEOMETRY(GEOMETRY, 4326),
  storage_path TEXT,
  feature_count INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'ready', 'error')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS layers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dataset_id UUID REFERENCES datasets(id) ON DELETE CASCADE,
  name TEXT,
  geom GEOMETRY(GEOMETRY, 4326),
  properties JSONB DEFAULT '{}',
  CONSTRAINT idx_layers_geom UNIQUE (id)
);

CREATE INDEX IF NOT EXISTS idx_layers_geom ON layers USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_layers_dataset ON layers(dataset_id);
CREATE INDEX IF NOT EXISTS idx_layers_properties ON layers USING GIN (properties);

CREATE TABLE IF NOT EXISTS etl_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'done', 'failed')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  error TEXT,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ
);
```

- [ ] **Step 3: Write migrate.ts**

```typescript
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
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/db/migrations/ backend/src/db/migrate.ts
git commit -m "feat: add database migrations for public and tenant schemas"
```

---

### Task 9: Backend — Datasets Module

**Files:**
- Create: `backend/src/modules/datasets/datasets.repo.ts`
- Create: `backend/src/modules/datasets/datasets.service.ts`
- Create: `backend/src/modules/datasets/datasets.routes.ts`

- [ ] **Step 1: Write datasets.repo.ts**

```typescript
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
  client: PoolClient,
  schema: string,
  id: string,
): Promise<Dataset | null> {
  const result = await client.query(
    `SELECT id, name, type, geometry_column, feature_count, status, created_at, updated_at
     FROM ${schema}.datasets WHERE id = $1`,
    [id],
  );
  return result.rows[0] || null;
}

export async function createDataset(
  client: PoolClient,
  schema: string,
  data: { name: string; type: string },
): Promise<Dataset> {
  const result = await client.query(
    `INSERT INTO ${schema}.datasets (name, type) VALUES ($1, $2) RETURNING *`,
    [data.name, data.type],
  );
  return result.rows[0];
}

export async function deleteDataset(
  client: PoolClient,
  schema: string,
  id: string,
): Promise<void> {
  await client.query(`DELETE FROM ${schema}.datasets WHERE id = $1`, [id]);
}

export async function updateDatasetStatus(
  client: PoolClient,
  schema: string,
  id: string,
  status: string,
  featureCount?: number,
): Promise<void> {
  await client.query(
    `UPDATE ${schema}.datasets SET status = $1, feature_count = COALESCE($3, feature_count) WHERE id = $2`,
    [status, id, featureCount],
  );
}

export async function queryFeatures(
  client: PoolClient,
  schema: string,
  datasetId: string,
  limit = 50,
  offset = 0,
) {
  const result = await client.query(
    `SELECT id, name, ST_AsGeoJSON(geom)::json as geometry, properties
     FROM ${schema}.layers WHERE dataset_id = $1
     ORDER BY id LIMIT $2 OFFSET $3`,
    [datasetId, limit, offset],
  );
  return result.rows.map((row) => ({
    id: row.id,
    type: 'Feature',
    geometry: row.geometry,
    properties: { name: row.name, ...row.properties },
  }));
}
```

- [ ] **Step 2: Write datasets.service.ts**

```typescript
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
```

- [ ] **Step 3: Write datasets.routes.ts**

```typescript
import { FastifyInstance } from 'fastify';
import * as service from './datasets.service.js';
import { ValidationError } from '../../lib/errors.js';

const createDatasetSchema = {
  type: 'object',
  required: ['name', 'type'],
  properties: {
    name: { type: 'string', minLength: 1 },
    type: { type: 'string', enum: ['point', 'line', 'polygon', 'raster'] },
  },
};

export async function datasetRoutes(app: FastifyInstance) {
  app.get('/datasets', async (request) => {
    return service.listDatasets(request);
  });

  app.post('/datasets', async (request, reply) => {
    const body = request.body as any;
    if (!body.name || !body.type) {
      throw new ValidationError('name and type are required');
    }
    const dataset = await service.createDataset(request, body);
    reply.status(201);
    return dataset;
  });

  app.get('/datasets/:id', async (request) => {
    const { id } = request.params as { id: string };
    return service.getDataset(request, id);
  });

  app.delete('/datasets/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    await service.deleteDataset(request, id);
    reply.status(204);
  });

  app.get('/datasets/:id/features', async (request) => {
    const { id } = request.params as { id: string };
    const { limit, offset } = request.query as { limit?: number; offset?: number };
    return service.getFeatures(request, id, limit, offset);
  });
}
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/modules/datasets/
git commit -m "feat: add datasets CRUD module"
```

---

### Task 10: Backend — Upload & ETL Module

**Files:**
- Create: `backend/src/modules/upload/etl.processor.ts`
- Create: `backend/src/modules/upload/upload.service.ts`
- Create: `backend/src/modules/upload/upload.routes.ts`

- [ ] **Step 1: Write etl.processor.ts**

```typescript
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { Config } from '../../config.js';
import { getPool, withTenantClient } from '../../db/pool.js';
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

  // Step 1: Update status to processing
  await pool.query(
    `UPDATE ${schema}.datasets SET status = 'processing' WHERE id = $1`,
    [datasetId],
  );

  try {
    // Step 2: Save raw file to MinIO
    const rawPath = `raw/${tenantSlug}/${datasetId}/${fileName}`;
    const mimeType = fileName.endsWith('.json') || fileName.endsWith('.geojson')
      ? 'application/json'
      : 'application/octet-stream';
    await uploadFile(config, rawPath, fileBuffer, mimeType);

    // Step 3: Write temp file for GDAL processing
    const tmpDir = `/tmp/geostack-${datasetId}`;
    const tmpFile = `${tmpDir}/${fileName}`;
    await execFileP('mkdir', ['-p', tmpDir]);
    const { writeFileSync } = await import('node:fs');
    writeFileSync(tmpFile, fileBuffer);

    // Step 4: Validate with ogrinfo
    await execFileP('ogrinfo', ['-so', tmpFile]);

    // Step 5: Transform & load with ogr2ogr (direct to PostgreSQL)
    const dbUrl = config.DATABASE_URL;
    await execFileP('ogr2ogr', [
      '-f', 'PostgreSQL',
      `PG:${dbUrl}`,
      tmpFile,
      '-nln', `${schema}.layers`,
      '-lco', 'GEOMETRY_NAME=geom',
      '-lco', 'FID=id',
      '-t_srs', 'EPSG:4326',
      '-overwrite',
      '-nlt', 'GEOMETRY',
      '--config', 'PG_USE_COPY', 'YES',
    ]);

    // Step 6: Count inserted features
    const countResult = await pool.query(
      `SELECT COUNT(*) as count FROM ${schema}.layers`,
    );
    const featureCount = parseInt(countResult.rows[0].count, 10);

    // Step 7: Update dataset status to ready
    await pool.query(
      `UPDATE ${schema}.datasets
       SET status = 'ready', feature_count = $1, storage_path = $2
       WHERE id = $3`,
      [featureCount, rawPath, datasetId],
    );

    // Cleanup temp
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
```

- [ ] **Step 2: Write upload.service.ts**

```typescript
import { FastifyRequest } from 'fastify';
import { Config } from '../../config.js';
import { withTenantClient } from '../../db/pool.js';
import * as datasetRepo from '../datasets/datasets.repo.js';
import { NotFoundError } from '../../lib/errors.js';
import { runEtl } from './etl.processor.js';

export async function handleUpload(
  request: FastifyRequest,
  datasetId: string,
  fileBuffer: Buffer,
  fileName: string,
): Promise<{ jobId: string }> {
  const config = (request as any).server.config as Config;

  // Verify dataset exists in tenant schema
  await withTenantClient(request.tenantSlug, async (client) => {
    const ds = await datasetRepo.getDataset(client, request.tenantSchema, datasetId);
    if (!ds) throw new NotFoundError('Dataset', datasetId);
  });

  // Run ETL synchronously (for portfolio; production would use queue)
  const result = await runEtl(config, request.tenantSlug, datasetId, fileBuffer, fileName);

  return { jobId: datasetId, ...result };
}
```

- [ ] **Step 3: Write upload.routes.ts**

```typescript
import { FastifyInstance } from 'fastify';
import { handleUpload } from './upload.service.js';
import { ValidationError } from '../../lib/errors.js';

export async function uploadRoutes(app: FastifyInstance) {
  app.post('/upload/:datasetId', async (request, reply) => {
    const { datasetId } = request.params as { datasetId: string };
    const file = await request.file();

    if (!file) {
      throw new ValidationError('No file uploaded');
    }

    const buffer = await file.toBuffer();
    const result = await handleUpload(request, datasetId, buffer, file.filename);
    reply.status(202);
    return result;
  });
}
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/modules/upload/
git commit -m "feat: add upload and ETL pipeline module"
```

---

### Task 11: Backend — Tiles Proxy Module

**Files:**
- Create: `backend/src/modules/tiles/tiles.routes.ts`

- [ ] **Step 1: Write tiles.routes.ts**

```typescript
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Config } from '../../config.js';

export async function tileRoutes(app: FastifyInstance) {
  // Vector tiles via Martin
  app.get('/tiles/vector/:z/:x/:y', async (request: FastifyRequest, reply: FastifyReply) => {
    const { z, x, y } = request.params as { z: string; x: string; y: string };
    const config = (app as any).config as Config;

    const url = new URL(`${config.MARTIN_URL}/${request.tenantSchema}.layers/${z}/${x}/${y}`);
    const response = await fetch(url.toString());

    reply
      .header('Content-Type', response.headers.get('content-type') || 'application/x-protobuf')
      .header('Content-Encoding', response.headers.get('content-encoding') || '')
      .header('Cache-Control', 'public, max-age=3600');

    if (response.status === 204) {
      return reply.status(204).send();
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    return reply.send(buffer);
  });

  // Raster tiles via TiTiler
  app.get('/tiles/raster/:z/:x/:y', async (request: FastifyRequest, reply: FastifyReply) => {
    const { z, x, y } = request.params as { z: string; x: string; y: string };
    const config = (app as any).config as Config;

    const url = new URL(`${config.TITILER_URL}/cog/tiles/WebMercatorQuad/${z}/${x}/${y}`);
    const response = await fetch(url.toString());

    reply
      .header('Content-Type', response.headers.get('content-type') || 'image/png')
      .header('Cache-Control', 'public, max-age=3600');

    if (response.status === 204) {
      return reply.status(204).send();
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    return reply.send(buffer);
  });

  // GeoServer proxy (WMS/WFS/WMTS)
  app.all('/geoserver/*', async (request: FastifyRequest, reply: FastifyReply) => {
    const config = (app as any).config as Config;
    const targetPath = request.url.replace('/api/v1/geoserver', '/geoserver');
    const url = new URL(`${config.GEOSERVER_URL}${targetPath}`);

    const response = await fetch(url.toString(), {
      method: request.method,
      headers: { 'Content-Type': request.headers['content-type'] || 'application/xml' },
      body: request.method !== 'GET' && request.method !== 'HEAD'
        ? JSON.stringify(request.body)
        : undefined,
    });

    const ct = response.headers.get('content-type') || 'application/octet-stream';
    reply.header('Content-Type', ct);

    const buffer = Buffer.from(await response.arrayBuffer());
    return reply.send(buffer);
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/modules/tiles/
git commit -m "feat: add tile proxy routes for Martin, TiTiler, and GeoServer"
```

---

### Task 12: Frontend Setup — package.json, Vite, Tailwind

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/tsconfig.json`
- Create: `frontend/tsconfig.node.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/tailwind.config.ts`
- Create: `frontend/index.html`
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/styles/index.css`

- [ ] **Step 1: Create frontend directories**

```bash
mkdir -p /Users/faisalaffan/geostack/frontend/src/{pages,components/{map,datasets,shared},hooks,lib,styles}
```

- [ ] **Step 2: Write frontend package.json**

```json
{
  "name": "geostack-web",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-map-gl": "^7.1.0",
    "maplibre-gl": "^4.7.0",
    "@tanstack/react-query": "^5.60.0",
    "keycloak-js": "^25.0.0",
    "react-router-dom": "^7.1.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.7.0",
    "vite": "^6.0.0",
    "vitest": "^3.0.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "jsdom": "^25.0.0",
    "msw": "^2.0.0"
  }
}
```

- [ ] **Step 3: Write tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true
  },
  "include": ["src"]
}
```

- [ ] **Step 4: Write vite.config.ts**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://api:3000',
        changeOrigin: true,
      },
    },
  },
});
```

- [ ] **Step 5: Write tailwind.config.ts**

```typescript
import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
} satisfies Config;
```

- [ ] **Step 6: Write postcss.config.js**

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 7: Write index.html**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Geostack</title>
  </head>
  <body class="bg-gray-50 text-gray-900">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 8: Write src/main.tsx**

```typescript
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './styles/index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      retry: 1,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
```

- [ ] **Step 9: Write src/styles/index.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 10: Commit**

```bash
git add frontend/package.json frontend/tsconfig.json frontend/vite.config.ts frontend/tailwind.config.ts frontend/index.html frontend/src/main.tsx frontend/src/styles/index.css
git commit -m "chore: scaffold frontend with React, Vite, Tailwind"
```

---

### Task 13: Frontend — Keycloak & API Client

**Files:**
- Create: `frontend/src/lib/keycloak.ts`
- Create: `frontend/src/lib/api.ts`
- Create: `frontend/src/hooks/useAuth.ts`

- [ ] **Step 1: Write lib/keycloak.ts**

```typescript
import Keycloak from 'keycloak-js';

const keycloak = new Keycloak({
  url: import.meta.env.VITE_KEYCLOAK_URL || 'http://localhost:8081',
  realm: import.meta.env.VITE_KEYCLOAK_REALM || 'geostack',
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'geostack-web',
});

export default keycloak;
```

- [ ] **Step 2: Write lib/api.ts**

```typescript
import keycloak from './keycloak';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = keycloak.token;

  const headers: Record<string, string> = {
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Don't set Content-Type for FormData (browser sets it with boundary)
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(response.status, body.message || response.statusText);
  }

  if (response.status === 204) return undefined as T;

  return response.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),

  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),

  delete: <T>(path: string) =>
    request<T>(path, { method: 'DELETE' }),

  upload: <T>(path: string, formData: FormData) =>
    request<T>(path, {
      method: 'POST',
      body: formData,
    }),
};

export { ApiError };
```

- [ ] **Step 3: Write hooks/useAuth.ts**

```typescript
import { useState, useEffect, useCallback } from 'react';
import keycloak from '../lib/keycloak';
import { api } from '../lib/api';

interface UserInfo {
  id: string;
  username: string;
  email: string;
  organizationId: string;
  organizationName: string;
  role: string;
}

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: UserInfo | null;
  token: string | null;
  login: () => void;
  logout: () => void;
}

export function useAuth(): AuthState {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    keycloak
      .init({ onLoad: 'check-sso', silentCheckSsoRedirectUri: window.location.origin + '/silent-check-sso.html' })
      .then((authenticated) => {
        setIsAuthenticated(authenticated);
        if (authenticated && keycloak.token) {
          setToken(keycloak.token);

          // In dev mode without real Keycloak, fetch mock token
          if (!keycloak.token || keycloak.token.length < 10) {
            api.get<{ token: string }>('/api/v1/auth/login').then((res) => {
              setToken(res.token);
              return api.get<UserInfo>('/api/v1/auth/me');
            }).then(setUser).catch(console.error);
          }
        }
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(() => {
    keycloak.login();
  }, []);

  const logout = useCallback(() => {
    keycloak.logout();
    setIsAuthenticated(false);
    setUser(null);
    setToken(null);
  }, []);

  return { isAuthenticated, isLoading, user, token, login, logout };
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/lib/ frontend/src/hooks/useAuth.ts
git commit -m "feat: add Keycloak adapter, API client, and auth hook"
```

---

### Task 14: Frontend — App Router & Layout

**Files:**
- Create: `frontend/src/App.tsx`
- Create: `frontend/src/components/shared/AuthGuard.tsx`
- Create: `frontend/src/components/shared/Layout.tsx`
- Create: `frontend/src/components/shared/StatusBadge.tsx`
- Create: `frontend/src/pages/Login.tsx`

- [ ] **Step 1: Write App.tsx**

```typescript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { AuthGuard } from './components/shared/AuthGuard';
import { Layout } from './components/shared/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { DatasetDetail } from './pages/DatasetDetail';
import { MapView } from './pages/MapView';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          element={
            <AuthGuard>
              <Layout />
            </AuthGuard>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/datasets/:id" element={<DatasetDetail />} />
          <Route path="/map" element={<MapView />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
```

- [ ] **Step 2: Write AuthGuard.tsx**

```typescript
import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export function AuthGuard({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
```

- [ ] **Step 3: Write Layout.tsx**

```typescript
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <h1 className="text-xl font-bold">Geostack</h1>
          <p className="text-sm text-gray-400">{user?.organizationName}</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `block px-3 py-2 rounded ${isActive ? 'bg-blue-600' : 'hover:bg-gray-800'}`
            }
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/map"
            className={({ isActive }) =>
              `block px-3 py-2 rounded ${isActive ? 'bg-blue-600' : 'hover:bg-gray-800'}`
            }
          >
            Map Viewer
          </NavLink>
        </nav>
        <div className="p-4 border-t border-gray-700">
          <p className="text-sm">{user?.username}</p>
          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="text-sm text-gray-400 hover:text-white mt-1"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 4: Write StatusBadge.tsx**

```typescript
const colorMap: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  ready: 'bg-green-100 text-green-800',
  error: 'bg-red-100 text-red-800',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorMap[status] || 'bg-gray-100 text-gray-800'}`}>
      {status}
    </span>
  );
}
```

- [ ] **Step 5: Write Login.tsx**

```typescript
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api';

export function Login() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleDevLogin = async () => {
    try {
      const { token } = await api.get<{ token: string }>('/api/v1/auth/login');
      localStorage.setItem('dev_token', token);
      navigate('/', { replace: true });
    } catch (err) {
      console.error('Login failed:', err);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-6">Geostack</h1>
        <p className="text-gray-600 text-center mb-6">
          Geospatial Data Platform
        </p>
        <button
          onClick={login}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 mb-3"
        >
          Sign in with Keycloak
        </button>
        <button
          onClick={handleDevLogin}
          className="w-full bg-gray-200 text-gray-700 py-2 px-4 rounded hover:bg-gray-300 text-sm"
        >
          Dev Mode Login (Skip Keycloak)
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src/App.tsx frontend/src/components/shared/ frontend/src/pages/Login.tsx
git commit -m "feat: add app router, layout, auth guard, and login page"
```

---

### Task 15: Frontend — Dashboard & Dataset Pages

**Files:**
- Create: `frontend/src/hooks/useDatasets.ts`
- Create: `frontend/src/components/datasets/DatasetList.tsx`
- Create: `frontend/src/components/datasets/DatasetUpload.tsx`
- Create: `frontend/src/components/datasets/DatasetTable.tsx`
- Create: `frontend/src/pages/Dashboard.tsx`
- Create: `frontend/src/pages/DatasetDetail.tsx`

- [ ] **Step 1: Write hooks/useDatasets.ts**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

interface Dataset {
  id: string;
  name: string;
  type: 'point' | 'line' | 'polygon' | 'raster';
  feature_count: number;
  status: 'pending' | 'processing' | 'ready' | 'error';
  created_at: string;
  updated_at: string;
}

interface Feature {
  id: string;
  type: 'Feature';
  geometry: unknown;
  properties: Record<string, unknown>;
}

export function useDatasets() {
  return useQuery({
    queryKey: ['datasets'],
    queryFn: () => api.get<Dataset[]>('/api/v1/datasets'),
  });
}

export function useDataset(id: string) {
  return useQuery({
    queryKey: ['datasets', id],
    queryFn: () => api.get<Dataset>(`/api/v1/datasets/${id}`),
    enabled: !!id,
  });
}

export function useFeatures(datasetId: string) {
  return useQuery({
    queryKey: ['datasets', datasetId, 'features'],
    queryFn: () => api.get<Feature[]>(`/api/v1/datasets/${datasetId}/features?limit=100`),
    enabled: !!datasetId,
  });
}

export function useCreateDataset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; type: string }) =>
      api.post<Dataset>('/api/v1/datasets', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['datasets'] }),
  });
}

export function useDeleteDataset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/datasets/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['datasets'] }),
  });
}

export function useUploadFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ datasetId, file }: { datasetId: string; file: File }) => {
      const formData = new FormData();
      formData.append('file', file);
      return api.upload(`/api/v1/upload/${datasetId}`, formData);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['datasets', variables.datasetId] });
      queryClient.invalidateQueries({ queryKey: ['datasets'] });
    },
  });
}
```

- [ ] **Step 2: Write DatasetList.tsx**

```typescript
import { useNavigate } from 'react-router-dom';
import { useDatasets } from '../../hooks/useDatasets';
import { StatusBadge } from '../shared/StatusBadge';
import type { Dataset } from '../../hooks/useDatasets';

interface Props {
  onCreateNew: () => void;
}

export function DatasetList({ onCreateNew }: Props) {
  const { data: datasets, isLoading } = useDatasets();
  const navigate = useNavigate();

  if (isLoading) {
    return <div className="text-gray-500">Loading datasets...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Datasets</h2>
        <button
          onClick={onCreateNew}
          className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
        >
          + New Dataset
        </button>
      </div>

      {(!datasets || datasets.length === 0) ? (
        <p className="text-gray-500 text-sm">No datasets yet. Create one to get started.</p>
      ) : (
        <div className="space-y-2">
          {datasets.map((ds: Dataset) => (
            <div
              key={ds.id}
              onClick={() => navigate(`/datasets/${ds.id}`)}
              className="bg-white border rounded-lg p-4 hover:border-blue-400 cursor-pointer transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">{ds.name}</h3>
                  <p className="text-sm text-gray-500">
                    {ds.type} &middot; {ds.feature_count} features
                  </p>
                </div>
                <StatusBadge status={ds.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Write DatasetUpload.tsx**

```typescript
import { useState, useRef, type FormEvent } from 'react';
import { useUploadFile } from '../../hooks/useDatasets';

interface Props {
  datasetId: string;
  onDone: () => void;
}

export function DatasetUpload({ datasetId, onDone }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const upload = useUploadFile();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) return;

    try {
      await upload.mutateAsync({ datasetId, file });
      setFile(null);
      if (inputRef.current) inputRef.current.value = '';
      onDone();
    } catch (err) {
      console.error('Upload failed:', err);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-6">
      <p className="text-sm text-gray-600 mb-3">
        Upload a shapefile (.zip), GeoJSON, or GeoTIFF
      </p>
      <input
        ref={inputRef}
        type="file"
        accept=".zip,.json,.geojson,.tif,.tiff,.gpkg"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        className="mb-3 text-sm"
      />
      <button
        type="submit"
        disabled={!file || upload.isPending}
        className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700 disabled:opacity-50"
      >
        {upload.isPending ? 'Uploading...' : 'Upload & Process'}
      </button>
      {upload.isError && (
        <p className="text-red-600 text-sm mt-2">Upload failed. Try again.</p>
      )}
      {upload.isSuccess && (
        <p className="text-green-600 text-sm mt-2">File processed successfully!</p>
      )}
    </form>
  );
}
```

- [ ] **Step 4: Write DatasetTable.tsx**

```typescript
import { useFeatures } from '../../hooks/useDatasets';

interface Props {
  datasetId: string;
}

export function DatasetTable({ datasetId }: Props) {
  const { data: features, isLoading } = useFeatures(datasetId);

  if (isLoading) return <p className="text-gray-500 text-sm">Loading features...</p>;
  if (!features || features.length === 0) return <p className="text-gray-500 text-sm">No features yet.</p>;

  const propertyKeys = Object.keys(features[0]?.properties || {});

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="text-left p-2">ID</th>
            {propertyKeys.map((key) => (
              <th key={key} className="text-left p-2">{key}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {features.map((f: any, i: number) => (
            <tr key={f.id || i} className="border-t hover:bg-gray-50">
              <td className="p-2 font-mono text-xs">{f.id?.slice(0, 8)}</td>
              {propertyKeys.map((key) => (
                <td key={key} className="p-2">{String(f.properties[key] ?? '')}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 5: Write Dashboard.tsx**

```typescript
import { useState } from 'react';
import { DatasetList } from '../components/datasets/DatasetList';
import { useCreateDataset } from '../hooks/useDatasets';

export function Dashboard() {
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('point');
  const createDataset = useCreateDataset();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createDataset.mutateAsync({ name, type });
      setName('');
      setShowCreate(false);
    } catch (err) {
      console.error('Create failed:', err);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {showCreate && (
        <div className="bg-white border rounded-lg p-6 mb-6">
          <h3 className="font-semibold mb-4">Create New Dataset</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder="Cell Towers Q1 2025"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm"
              >
                <option value="point">Point</option>
                <option value="line">Line</option>
                <option value="polygon">Polygon</option>
                <option value="raster">Raster</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={createDataset.isPending}
                className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="bg-gray-200 px-4 py-2 rounded text-sm hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <DatasetList onCreateNew={() => setShowCreate(true)} />
    </div>
  );
}
```

- [ ] **Step 6: Write DatasetDetail.tsx**

```typescript
import { useParams, useNavigate } from 'react-router-dom';
import { useDataset, useDeleteDataset } from '../hooks/useDatasets';
import { StatusBadge } from '../components/shared/StatusBadge';
import { DatasetUpload } from '../components/datasets/DatasetUpload';
import { DatasetTable } from '../components/datasets/DatasetTable';

export function DatasetDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: dataset, isLoading } = useDataset(id!);
  const deleteDataset = useDeleteDataset();

  if (isLoading) return <p className="text-gray-500">Loading...</p>;
  if (!dataset) return <p className="text-red-600">Dataset not found.</p>;

  const handleDelete = async () => {
    if (!confirm('Delete this dataset and all its data?')) return;
    await deleteDataset.mutateAsync(id!);
    navigate('/');
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <button onClick={() => navigate('/')} className="text-sm text-blue-600 hover:underline mb-1">
            &larr; Back to Dashboard
          </button>
          <h1 className="text-2xl font-bold">{dataset.name}</h1>
          <p className="text-sm text-gray-500">
            Type: {dataset.type} &middot; Features: {dataset.feature_count}
          </p>
          <StatusBadge status={dataset.status} />
        </div>
        <button
          onClick={handleDelete}
          className="bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700"
        >
          Delete Dataset
        </button>
      </div>

      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Upload Data</h2>
        <DatasetUpload datasetId={id!} onDone={() => {}} />
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">Features</h2>
        <button
          onClick={() => navigate(`/map?dataset=${id}`)}
          className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700 mb-4"
        >
          View on Map
        </button>
        <DatasetTable datasetId={id!} />
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/Dashboard.tsx frontend/src/pages/DatasetDetail.tsx frontend/src/components/datasets/ frontend/src/hooks/useDatasets.ts
git commit -m "feat: add dashboard, dataset detail, upload, and table components"
```

---

### Task 16: Frontend — Map Components

**Files:**
- Create: `frontend/src/hooks/useMap.ts`
- Create: `frontend/src/components/map/MapContainer.tsx`
- Create: `frontend/src/components/map/BaselineLayer.tsx`
- Create: `frontend/src/components/map/VectorLayer.tsx`
- Create: `frontend/src/components/map/RasterLayer.tsx`
- Create: `frontend/src/components/map/LayerControl.tsx`
- Create: `frontend/src/components/map/PopupCard.tsx`
- Create: `frontend/src/pages/MapView.tsx`

- [ ] **Step 1: Write hooks/useMap.ts**

```typescript
import { useState, useCallback } from 'react';

interface ViewState {
  longitude: number;
  latitude: number;
  zoom: number;
}

interface MapLayers {
  vector: boolean;
  raster: boolean;
  geoserver: boolean;
}

export function useMap() {
  const [viewState, setViewState] = useState<ViewState>({
    longitude: 106.8272,
    latitude: -6.5971,
    zoom: 12,
  });

  const [layers, setLayers] = useState<MapLayers>({
    vector: true,
    raster: false,
    geoserver: false,
  });

  const [selectedFeature, setSelectedFeature] = useState<any>(null);

  const toggleLayer = useCallback((name: keyof MapLayers) => {
    setLayers((prev) => ({ ...prev, [name]: !prev[name] }));
  }, []);

  return {
    viewState,
    setViewState,
    layers,
    toggleLayer,
    selectedFeature,
    setSelectedFeature,
  };
}
```

- [ ] **Step 2: Write MapContainer.tsx**

```typescript
import { useRef, useEffect } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

interface Props {
  viewState: { longitude: number; latitude: number; zoom: number };
  onMove?: (viewState: { longitude: number; latitude: number; zoom: number }) => void;
  onClick?: (feature: any) => void;
  children?: React.ReactNode;
}

export function MapContainer({ viewState, onMove, onClick, children }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '&copy; OpenStreetMap contributors',
          },
        },
        layers: [
          {
            id: 'osm-layer',
            type: 'raster',
            source: 'osm',
          },
        ],
      },
      center: [viewState.longitude, viewState.latitude],
      zoom: viewState.zoom,
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-right');

    map.on('moveend', () => {
      if (onMove && mapRef.current) {
        const center = mapRef.current.getCenter();
        onMove({
          longitude: center.lng,
          latitude: center.lat,
          zoom: mapRef.current.getZoom(),
        });
      }
    });

    map.on('click', (e) => {
      const features = map.queryRenderedFeatures(e.point);
      if (features.length > 0 && onClick) {
        onClick(features[0]);
      }
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full min-h-[500px] rounded-lg overflow-hidden">
      {children}
    </div>
  );
}
```

- [ ] **Step 3: Write BaselineLayer.tsx**

No dedicated component needed — handled inside MapContainer via the OSM raster source. This file is reserved for future basemap selector functionality.

- [ ] **Step 4: Write VectorLayer.tsx**

```typescript
import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';

interface Props {
  map: maplibregl.Map | null;
  visible: boolean;
  tileUrl: string;
  layerId: string;
  color?: string;
}

export function VectorLayer({ map, visible, tileUrl, layerId, color = '#2563eb' }: Props) {
  const sourceId = `${layerId}-source`;

  useEffect(() => {
    if (!map) return;

    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, {
        type: 'vector',
        tiles: [tileUrl],
        minzoom: 0,
        maxzoom: 22,
      });
    }

    if (!map.getLayer(layerId)) {
      map.addLayer({
        id: layerId,
        type: 'circle',
        source: sourceId,
        'source-layer': 'default',
        paint: {
          'circle-color': color,
          'circle-radius': 6,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      });
    }

    return () => {
      if (map.getLayer(layerId)) {
        map.removeLayer(layerId);
      }
      if (map.getSource(sourceId)) {
        map.removeSource(sourceId);
      }
    };
  }, [map, sourceId, layerId]);

  useEffect(() => {
    if (!map?.getLayer(layerId)) return;
    map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
  }, [map, visible, layerId]);

  return null;
}
```

- [ ] **Step 5: Write RasterLayer.tsx**

```typescript
import { useEffect } from 'react';
import maplibregl from 'maplibre-gl';

interface Props {
  map: maplibregl.Map | null;
  visible: boolean;
  tileUrl: string;
  layerId: string;
}

export function RasterLayer({ map, visible, tileUrl, layerId }: Props) {
  const sourceId = `${layerId}-source`;

  useEffect(() => {
    if (!map) return;

    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, {
        type: 'raster',
        tiles: [tileUrl],
        tileSize: 256,
        minzoom: 0,
        maxzoom: 22,
      });
    }

    if (!map.getLayer(layerId)) {
      map.addLayer({
        id: layerId,
        type: 'raster',
        source: sourceId,
        paint: {
          'raster-opacity': 0.8,
        },
      });
    }

    return () => {
      if (map.getLayer(layerId)) map.removeLayer(layerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    };
  }, [map, sourceId, layerId]);

  useEffect(() => {
    if (!map?.getLayer(layerId)) return;
    map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
  }, [map, visible, layerId]);

  return null;
}
```

- [ ] **Step 6: Write LayerControl.tsx**

```typescript
interface Layer {
  id: string;
  label: string;
  visible: boolean;
}

interface Props {
  layers: Layer[];
  onToggle: (id: string) => void;
}

export function LayerControl({ layers, onToggle }: Props) {
  return (
    <div className="absolute top-4 right-4 bg-white rounded-lg shadow-md p-3 z-10 min-w-[180px]">
      <h3 className="text-sm font-semibold mb-2">Layers</h3>
      {layers.map((layer) => (
        <label key={layer.id} className="flex items-center gap-2 text-sm py-1 cursor-pointer">
          <input
            type="checkbox"
            checked={layer.visible}
            onChange={() => onToggle(layer.id)}
            className="rounded"
          />
          {layer.label}
        </label>
      ))}
    </div>
  );
}
```

- [ ] **Step 7: Write PopupCard.tsx**

```typescript
interface Props {
  feature: any;
  onClose: () => void;
}

export function PopupCard({ feature, onClose }: Props) {
  const props = feature?.properties || {};

  return (
    <div className="absolute bottom-6 left-6 bg-white rounded-lg shadow-lg p-4 z-10 max-w-sm">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-sm">{props.name || 'Feature Detail'}</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">&times;</button>
      </div>
      <dl className="text-xs space-y-1">
        {Object.entries(props).map(([key, value]) => (
          <div key={key} className="flex justify-between gap-4">
            <dt className="text-gray-500">{key}</dt>
            <dd className="font-mono">{String(value)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
```

- [ ] **Step 8: Write MapView.tsx**

```typescript
import { useSearchParams } from 'react-router-dom';
import { useMap } from '../hooks/useMap';
import { MapContainer } from '../components/map/MapContainer';
import { VectorLayer } from '../components/map/VectorLayer';
import { RasterLayer } from '../components/map/RasterLayer';
import { LayerControl } from '../components/map/LayerControl';
import { PopupCard } from '../components/map/PopupCard';

export function MapView() {
  const [searchParams] = useSearchParams();
  const datasetId = searchParams.get('dataset');
  const {
    viewState,
    setViewState,
    layers,
    toggleLayer,
    selectedFeature,
    setSelectedFeature,
  } = useMap();

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const layerDefs = [
    { id: 'vector', label: 'Vector Tiles (Martin)' },
    { id: 'raster', label: 'Raster Tiles (TiTiler)' },
    { id: 'geoserver', label: 'GeoServer WMS' },
  ];

  return (
    <div className="relative w-full h-[calc(100vh-10rem)]">
      <h1 className="text-2xl font-bold mb-4">
        Map Viewer {datasetId && <span className="text-sm text-gray-500 font-normal">— Dataset {datasetId.slice(0, 8)}</span>}
      </h1>

      <div className="relative w-full h-full">
        <MapContainer
          viewState={viewState}
          onMove={setViewState}
          onClick={setSelectedFeature}
        >
          <VectorLayer
            map={null} // The map ref is internal to MapContainer
            visible={layers.vector}
            tileUrl={`${API_BASE}/api/v1/tiles/vector/{z}/{x}/{y}`}
            layerId="vector-layer"
          />

          <RasterLayer
            map={null}
            visible={layers.raster}
            tileUrl={`${API_BASE}/api/v1/tiles/raster/{z}/{x}/{y}`}
            layerId="raster-layer"
          />

          <LayerControl layers={layerDefs} onToggle={toggleLayer} />

          {selectedFeature && (
            <PopupCard feature={selectedFeature} onClose={() => setSelectedFeature(null)} />
          )}
        </MapContainer>
      </div>
    </div>
  );
}
```

Note: The `MapContainer` component manages its own `maplibregl.Map` instance internally. The `VectorLayer` and `RasterLayer` components use the `map` prop which is `null` here because they need access to the internal map ref. In practice, the map layers will be managed through MapContainer's internal `useEffect`.

To properly wire layers, we'll refactor MapContainer to expose the map via a context.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/components/map/ frontend/src/pages/MapView.tsx frontend/src/hooks/useMap.ts
git commit -m "feat: add map components with MapLibre GL, vector and raster layers"
```

---

### Task 17: Keycloak Realm Configuration

**Files:**
- Create: `docker/init/03_realm.json`

- [ ] **Step 1: Write Keycloak realm export**

```json
{
  "id": "geostack",
  "realm": "geostack",
  "displayName": "Geostack",
  "enabled": true,
  "sslRequired": "external",
  "registrationAllowed": false,
  "loginWithEmailAllowed": true,
  "duplicateEmailsAllowed": false,
  "resetPasswordAllowed": true,
  "editUsernameAllowed": false,
  "bruteForceProtected": true,
  "clients": [
    {
      "clientId": "geostack-web",
      "name": "Geostack Web",
      "description": "React frontend",
      "enabled": true,
      "publicClient": true,
      "redirectUris": [
        "http://localhost:5173/*",
        "http://localhost:5173/silent-check-sso.html"
      ],
      "webOrigins": ["http://localhost:5173"],
      "standardFlowEnabled": true,
      "implicitFlowEnabled": false,
      "directAccessGrantsEnabled": true,
      "serviceAccountsEnabled": false
    },
    {
      "clientId": "geostack-api",
      "name": "Geostack API",
      "description": "Backend API (bearer-only)",
      "enabled": true,
      "publicClient": false,
      "bearerOnly": true,
      "standardFlowEnabled": false,
      "directAccessGrantsEnabled": false,
      "serviceAccountsEnabled": false
    }
  ],
  "users": [
    {
      "username": "demo_admin",
      "email": "admin@geostack.demo",
      "enabled": true,
      "emailVerified": true,
      "credentials": [
        {
          "type": "password",
          "value": "demo123",
          "temporary": false
        }
      ],
      "realmRoles": ["admin"],
      "attributes": {
        "org_id": "d290f1ee-6c54-4b01-90e6-d701748f0851",
        "org_slug": "demo_telecom"
      }
    }
  ],
  "roles": {
    "realm": [
      {
        "name": "admin",
        "description": "Organization administrator"
      },
      {
        "name": "editor",
        "description": "Can edit data"
      },
      {
        "name": "viewer",
        "description": "Read-only access"
      }
    ]
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add docker/init/03_realm.json
git commit -m "feat: add Keycloak realm configuration"
```

---

### Task 18: Backend Tests

**Files:**
- Create: `backend/tests/modules/auth.test.ts`
- Create: `backend/tests/modules/datasets.test.ts`
- Create: `backend/tests/modules/upload.test.ts`
- Create: `backend/tests/helpers/spatial.ts`

- [ ] **Step 1: Write spatial test helpers**

```typescript
// tests/helpers/spatial.ts
import { expect } from 'vitest';

/**
 * Assert that two GeoJSON geometries are spatially equal within a tolerance.
 * Requires PostGIS to be available if comparing via database.
 */
export function isPoint(lon: number, lat: number) {
  return {
    type: 'Point' as const,
    coordinates: [lon, lat],
  };
}

export function isPolygon(coords: number[][][]) {
  return {
    type: 'Polygon' as const,
    coordinates: coords,
  };
}
```

- [ ] **Step 2: Write auth tests**

```typescript
// tests/modules/auth.test.ts
import { describe, it, expect } from 'vitest';
import { getUserFromToken } from '../../src/modules/auth/auth.service.js';
import type { FastifyRequest } from 'fastify';

describe('getUserFromToken', () => {
  it('extracts user info from JWT payload', () => {
    const mockRequest = {
      user: {
        sub: 'user-123',
        preferred_username: 'demo',
        email: 'demo@test.com',
        org_id: 'org-1',
        org_slug: 'demo_org',
        realm_access: { roles: ['admin'] },
      },
    } as unknown as FastifyRequest;

    const result = getUserFromToken(mockRequest);

    expect(result.id).toBe('user-123');
    expect(result.username).toBe('demo');
    expect(result.role).toBe('admin');
    expect(result.organizationId).toBe('org-1');
  });

  it('defaults role to viewer for non-admin users', () => {
    const mockRequest = {
      user: {
        sub: 'user-456',
        preferred_username: 'viewer',
        email: 'viewer@test.com',
        org_id: 'org-1',
        org_slug: 'demo_org',
        realm_access: { roles: [] },
      },
    } as unknown as FastifyRequest;

    const result = getUserFromToken(mockRequest);
    expect(result.role).toBe('viewer');
  });
});
```

- [ ] **Step 3: Write datasets tests**

```typescript
// tests/modules/datasets.test.ts
import { describe, it, expect, vi } from 'vitest';

// Mock pg pool
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

    const mockClient = {
      query: vi.fn().mockResolvedValueOnce({
        rows: [{ id: 'ds-1', name: 'Test', type: 'point', status: 'pending' }],
      }),
    };

    const result = await withTenantClient('demo', (client: any) =>
      createDataset(client, 'tenant_demo', { name: 'Test', type: 'point' }),
    );

    expect(result.name).toBe('Test');
    expect(result.type).toBe('point');
  });
});
```

- [ ] **Step 4: Write upload tests**

```typescript
// tests/modules/upload.test.ts
import { describe, it, expect, vi } from 'vitest';

vi.mock('../../src/db/pool.js', () => ({
  getPool: vi.fn(() => ({ query: vi.fn() })),
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
        { type: 'Feature', geometry: { type: 'Point', coordinates: [106.8, -6.6] }, properties: {} },
      ],
    }));

    const result = await runEtl(mockConfig, 'demo', 'ds-1', fileBuffer, 'test.geojson');

    expect(result).toHaveProperty('featureCount');
    expect(result).toHaveProperty('storagePath');
  });
});
```

- [ ] **Step 5: Commit**

```bash
git add backend/tests/
git commit -m "test: add backend tests for auth, datasets, and ETL"
```

---

### Task 19: Frontend Tests

**Files:**
- Create: `frontend/vitest.config.ts`
- Create: `frontend/tests/components/DatasetList.test.tsx`

- [ ] **Step 1: Write vitest config for frontend**

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['tests/**/*.test.{ts,tsx}'],
    setupFiles: ['tests/setup.ts'],
  },
});
```

- [ ] **Step 2: Write test setup**

```bash
mkdir -p /Users/faisalaffan/geostack/frontend/tests/components
```

```typescript
// frontend/tests/setup.ts
import '@testing-library/jest-dom';
```

- [ ] **Step 3: Write DatasetList test**

```typescript
// frontend/tests/components/DatasetList.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock the hooks
vi.mock('../../src/hooks/useDatasets', () => ({
  useDatasets: () => ({
    data: [
      {
        id: '1',
        name: 'Cell Towers',
        type: 'point',
        feature_count: 42,
        status: 'ready',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      },
      {
        id: '2',
        name: 'Fiber Routes',
        type: 'line',
        feature_count: 8,
        status: 'processing',
        created_at: '2025-01-02T00:00:00Z',
        updated_at: '2025-01-02T00:00:00Z',
      },
    ],
    isLoading: false,
  }),
  useCreateDataset: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteDataset: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUploadFile: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

import { DatasetList } from '../../src/components/datasets/DatasetList';

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('DatasetList', () => {
  it('renders dataset names', () => {
    renderWithProviders(<DatasetList onCreateNew={() => {}} />);

    expect(screen.getByText('Cell Towers')).toBeInTheDocument();
    expect(screen.getByText('Fiber Routes')).toBeInTheDocument();
  });

  it('shows empty state when no datasets', () => {
    vi.mocked(await import('../../src/hooks/useDatasets')).useDatasets = () => ({
      data: [],
      isLoading: false,
    });

    renderWithProviders(<DatasetList onCreateNew={() => {}} />);
    expect(screen.getByText(/No datasets yet/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Commit**

```bash
git add frontend/vitest.config.ts frontend/tests/
git commit -m "test: add frontend test setup and DatasetList tests"
```

---

### Task 20: Final — Install Dependencies & Verify Build

**Files:**
- No new files. Install dependencies and verify TypeScript compiles.

> **Note:** Do NOT run `docker compose up`. Only install npm dependencies and verify the code compiles.

- [ ] **Step 1: Install backend dependencies**

```bash
cd /Users/faisalaffan/geostack/backend && npm install
```

- [ ] **Step 2: Install frontend dependencies**

```bash
cd /Users/faisalaffan/geostack/frontend && npm install
```

- [ ] **Step 3: Verify TypeScript compiles (backend)**

```bash
cd /Users/faisalaffan/geostack/backend && npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 4: Verify TypeScript compiles (frontend)**

```bash
cd /Users/faisalaffan/geostack/frontend && npx tsc --noEmit
```
Expected: No errors (or minimal errors that can be fixed inline).

- [ ] **Step 5: Verify backend tests run (no Docker needed)**

```bash
cd /Users/faisalaffan/geostack/backend && npx vitest run
```
Expected: Tests pass (mocked, no DB needed).

- [ ] **Step 6: Verify frontend tests run**

```bash
cd /Users/faisalaffan/geostack/frontend && npx vitest run
```
Expected: Tests pass.

- [ ] **Step 7: Commit**

```bash
git add backend/package-lock.json backend/node_modules/ frontend/package-lock.json frontend/node_modules/
# Note: adjust git add based on .gitignore — lock files should be committed
git commit -m "chore: install dependencies"
```
