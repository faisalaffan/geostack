# Geostack — Geospatial Data Platform Design

## Overview

Geostack is a multi-tenant geospatial data platform built as a portfolio project for a US-based telecommunications client position. It handles spatial data ingestion, processing, and visualization through a modern cloud-native stack.

### Goals

- Showcase a complete geospatial workflow: upload → ETL → PostGIS → tile serving → map visualization
- Demonstrate multi-tenant architecture with Keycloak OAuth2/OIDC
- Cover all technologies mentioned in the target job description
- Be fully runnable via `docker compose up`

### Non-Goals

- Production-grade security hardening
- Kubernetes manifests (reserved for future phase)
- CI/CD pipelines (reserved for future phase)
- Real-time collaboration features

---

## Architecture

A Docker Compose environment with 8 services:

```
 React (Vite)  ──▶  Node.js API (Fastify)  ──▶  PostgreSQL/PostGIS
   :5173              :3000                       :5432
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
       Martin        TiTiler       GeoServer       Keycloak
       :3001         :3002         :8080            :8081
          │              │              │
          └──────────────┼──────────────┘
                         ▼
                      MinIO
                      :9000
```

### Service Roles

| Service | Role |
|---------|------|
| **React (Vite)** | Frontend — MapLibre GL JS via react-map-gl, Keycloak auth, dataset management |
| **Node.js (Fastify)** | Backend API — multi-tenant REST API, ETL orchestration, tile proxy |
| **PostgreSQL/PostGIS** | Primary database — spatial tables, tenant schemas, ETL job tracking |
| **Martin** | Vector tile server — auto-publish from PostGIS, high-performance pbf output |
| **TiTiler** | Raster tile server — Cloud Optimized GeoTIFF (COG) serving |
| **GeoServer** | OGC standards — WMS, WFS, WMTS for enterprise compatibility demo |
| **Keycloak** | Identity provider — OAuth2/OIDC, per-organization realms, RBAC |
| **MinIO** | S3-compatible object storage — raw and processed file storage |

### Module Boundaries (Backend)

| Module | Responsibility |
|--------|---------------|
| `auth` | JWT validation (from Keycloak), user/organization info |
| `tenant` | Organization provisioning, tenant schema isolation |
| `datasets` | CRUD for datasets, layer preview, metadata management |
| `upload` | Multipart file upload, ETL pipeline orchestration |
| `tiles` | Proxy to Martin/TiTiler/GeoServer with auth validation |
| `etl` | Async pipeline: GDAL processing → PostGIS insert → status update |

### Multi-Tenancy

- Per-organization PostgreSQL schemas (`tenant_<slug>`)
- `public` schema holds shared lookup tables (`organizations`, `users`)
- Keycloak realm per organization with OAuth2 clients
- JWT contains `realm` and `org_id` claims → middleware resolves tenant schema
- Tile endpoints validate JWT before proxying to tile services

---

## Database Schema (PostgreSQL/PostGIS)

### Public Schema

```
organizations
├── id                    (UUID PK)
├── name                  (text)
├── slug                  (text, unique)
└── keycloak_realm_id     (text)

users
├── id                    (UUID PK)
├── keycloak_user_id      (text, unique)
├── organization_id       (FK → organizations)
└── role                  (enum: admin, editor, viewer)
```

### Tenant Schema (`tenant_<slug>`)

```
datasets
├── id                    (UUID PK)
├── name                  (text)
├── type                  (enum: point, line, polygon, raster)
├── geometry_column       (text, nullable for raster)
├── bbox                  (geometry, nullable)
├── storage_path          (text — MinIO path)
├── feature_count         (integer)
├── status                (enum: pending, processing, ready, error)
├── created_at
└── updated_at

layers
├── id                    (UUID PK)
├── dataset_id            (FK → datasets)
├── name                  (text)
├── geom                  (GEOMETRY, spatial index)
└── properties            (JSONB)

etl_jobs
├── id                    (UUID PK)
├── dataset_id            (FK → datasets)
├── status                (enum: queued, running, done, failed)
├── progress              (integer 0-100)
├── error                 (text, nullable)
├── started_at
└── finished_at
```

### Design Decisions

- **Per-tenant schema** — data isolation, easy backup/restore, aligns with PostGIS RLS capabilities
- **JSONB for properties** — flexible attribute storage for varied spatial data types without rigid schema
- **Spatial index on geom** — required for performant tile generation via Martin/GeoServer

---

## API Design

### Base: `/api/v1`

### Auth
```
POST   /auth/login          → validate Keycloak token, return user+org context
GET    /auth/me             → current user info
```

### Datasets
```
GET    /datasets            → list datasets (paginated, per tenant)
POST   /datasets            → create dataset (name, type)
GET    /datasets/:id        → dataset detail + feature count + bbox
DELETE /datasets/:id        → delete dataset + cleanup cascade
```

### Upload & ETL
```
POST   /upload              → multipart upload (shapefile/GeoJSON/GeoTIFF)
GET    /jobs/:id            → ETL job status
GET    /jobs               → list jobs (filterable by status)
```

### Tiles (proxied, auth-protected)
```
GET    /tiles/vector/:z/:x/:y.pbf       → Martin proxy
GET    /tiles/raster/:z/:x/:y.png       → TiTiler proxy
GET    /geoserver/*                     → GeoServer proxy (WMS/WFS/WMTS)
```

### Middleware Stack
```
tenant-context → jwt-verify → rbac-check → rate-limit → route handler
```

### Key Packages
- `fastify` — web framework
- `@fastify/multipart` — file upload handling
- `@fastify/jwt` — JWT verification
- `@fastify/cors` — cross-origin
- `@fastify/rate-limit` — per-tenant rate limiting
- `pg` / `pg-pool` — PostgreSQL client
- `keycloak-connect` — Keycloak adapter for Node.js

---

## Frontend

### Libraries

| Package | Purpose |
|---------|---------|
| `react` + `react-dom` | UI framework |
| `react-map-gl` | React wrapper for MapLibre GL |
| `maplibre-gl` | Map rendering engine |
| `@keycloak/keycloak-js` | Keycloak JavaScript adapter |
| `@tanstack/react-query` | Server state management, caching |
| `tailwindcss` | Utility-first styling |
| `vite` | Build tool |

### Pages

```
/login              → Keycloak redirect-based login
/dashboard          → Dataset list with mini-map preview
/datasets/:id       → Dataset detail, attribute table, upload form
/map                → Full-screen MapLibre viewer with layer controls
```

### Component Structure

```
App.tsx (router + AuthGuard)
├── Layout.tsx (sidebar nav + header + main content area)
├── pages/
│   ├── Login.tsx
│   ├── Dashboard.tsx
│   ├── DatasetDetail.tsx
│   └── MapView.tsx
├── components/
│   ├── map/
│   │   ├── MapContainer.tsx        (MapLibre GL + react-map-gl wrapper)
│   │   ├── LayerControl.tsx        (toggle layers on/off)
│   │   ├── VectorLayer.tsx         (Martin tile source connector)
│   │   ├── RasterLayer.tsx         (TiTiler tile source connector)
│   │   ├── BaselineLayer.tsx       (OSM/satellite basemap selector)
│   │   └── PopupCard.tsx           (feature click → attribute popup)
│   ├── datasets/
│   │   ├── DatasetList.tsx         (table with status badges)
│   │   ├── DatasetUpload.tsx       (drag-drop + ETL progress bar)
│   │   └── DatasetTable.tsx        (attribute table view)
│   └── shared/
│       ├── AuthGuard.tsx           (route protection)
│       └── StatusBadge.tsx         (ETL status indicator)
├── hooks/
│   ├── useAuth.ts                  (Keycloak integration)
│   ├── useDatasets.ts              (React Query hooks)
│   └── useMap.ts                   (react-map-gl state)
└── lib/
    ├── api.ts                      (HTTP client + JWT interceptor)
    └── keycloak.ts                 (Keycloak adapter init)
```

### User Flows
1. **Login:** User → Keycloak redirect → authenticate → redirect back with token
2. **Upload:** Dashboard → "New Dataset" → drag-drop shapefile → progress bar → auto-refresh list
3. **View:** Dashboard → "Open Map" → MapView with layer toggles → click feature → popup with properties

---

## ETL Pipeline

### Processing Steps

1. **Receive** — Save uploaded file to MinIO `raw/{tenant}/{dataset_id}/`
2. **Validate** — Check file type, CRS, geometry validity via `ogrinfo` / `gdalinfo`
3. **Transform** — `ogr2ogr` to EPSG:4326, save to MinIO `processed/{tenant}/{dataset_id}/`
4. **Load** — `ogr2ogr` direct insert into tenant-specific PostGIS layer table
5. **Notify** — Update `etl_jobs.status`, update `datasets.bbox` and `datasets.feature_count`

### Implementation
- Node.js `child_process.exec` calls GDAL CLI tools
- Each step updates `etl_jobs.progress` (20 → 40 → 60 → 80 → 100)
- Error at any step → `etl_jobs.status = 'failed'` with error message
- GDAL commands run inside the API container (GDAL installed via Dockerfile)

---

## Infrastructure

### Docker Compose Services

| Service | Image | Port | Notes |
|---------|-------|------|-------|
| `postgres` | `postgis/postgis:16-3.4` | 5432 | Extensions auto-enabled via init script |
| `api` | Custom Dockerfile | 3000 | Node.js 22, GDAL installed |
| `web` | Custom Dockerfile | 5173 | Vite dev server |
| `martin` | `ghcr.io/maplibre/martin:latest` | 3001 | Config via env vars |
| `titiler` | `ghcr.io/developmentseed/titiler:latest` | 3002 | COG tile serving |
| `geoserver` | `docker.osgeo.org/geoserver:2.25.x` | 8080 | Workspace per tenant, `-Xmx512m` |
| `keycloak` | `quay.io/keycloak/keycloak:25` | 8081 | Realm import on startup, `-Xmx384m` |
| `minio` | `minio/minio:latest` | 9000, 9001 | Console on :9001 |

### Resource Constraints (Target: 4GB RAM VPS)

Memory budget untuk 8 services:

| Service | Est. RAM | Notes |
|---------|----------|-------|
| `postgres` | 350 MB | shared_buffers=128MB |
| `api` | 200 MB | Node.js 22 + GDAL |
| `web` | 200 MB | Vite dev server |
| `martin` | 100 MB | Rust, very light |
| `titiler` | 250 MB | Python, single worker |
| `geoserver` | 500 MB | JVM `-Xmx512m`, single workspace |
| `keycloak` | 350 MB | JVM `-Xmx384m` |
| `minio` | 200 MB | Go, single bucket |
| **Total** | **~2.15 GB** | Leaves ~1.85 GB headroom |

JVM tuning via `JAVA_OPTS` environment variable in docker-compose:
```yaml
geoserver:
  environment:
    JAVA_OPTS: "-Xms128m -Xmx512m"
keycloak:
  environment:
    JAVA_OPTS: "-Xms128m -Xmx384m"
```

### Init Scripts (`docker/init/`)
- `01_extensions.sql` — `CREATE EXTENSION postgis; CREATE EXTENSION postgis_topology;`
- `02_seed.sql` — Sample telco data (cell towers, fiber routes, coverage polygons)
- `03_realm.json` — Keycloak realm pre-configured with demo organization and users

---

## Testing Strategy

- **Backend unit tests:** Vitest — individual service functions with mocked DB/S3
- **Backend integration tests:** Testcontainers (PostgreSQL), real PostGIS queries
- **Spatial assertion helpers:** `ST_Equals`, `ST_Within` etc. in test results
- **Frontend unit tests:** Vitest + React Testing Library — component rendering
- **Frontend integration:** MSW for API mocking
- **E2E (optional, future):** Playwright — one upload-to-map golden path

---

## Phase 2 (Future, Post-Portfolio)

- Kubernetes manifests (`k8s/` directory with Deployments, Services, Ingress)
- Proper async ETL with BullMQ + Redis
- WebSocket-based real-time ETL progress
- CI/CD with GitHub Actions
- Live deployment URL
