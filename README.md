# Geostack

Multi-tenant geospatial data platform for telecommunications network planning. Built as a fullstack portfolio project demonstrating cloud-native GIS architecture.

https://github.com/user-attachments/assets/placeholder

## Features

- **Multi-tenant architecture** — Per-organization schema isolation via PostgreSQL, Keycloak realm per tenant, JWT-based auth
- **Spatial ETL pipeline** — Upload shapefiles/GeoJSON/GeoTIFF, auto-process via GDAL (`ogr2ogr`), load to PostGIS
- **Vector & raster tile serving** — Martin (vector tiles), TiTiler (COG raster), GeoServer (OGC WMS/WFS/WMTS)
- **Interactive map viewer** — MapLibre GL JS with layer toggles, feature click popups, dataset attribute tables
- **Object storage** — MinIO S3-compatible for raw and processed file storage

## Architecture

```
 React (Vite) ──▶ Fastify API ──▶ PostgreSQL/PostGIS
   :5173            :3000            :5432
                      │
       ┌──────────────┼──────────────┐
       ▼              ▼              ▼
    Martin         TiTiler       GeoServer       Keycloak
    :3001          :3002         :8080            :8081
       │              │              │
       └──────────────┼──────────────┘
                      ▼
                   MinIO
                   :9000
```

### Backend Module Boundaries

| Module | Responsibility |
|--------|---------------|
| `auth` | JWT validation (Keycloak), user/org resolution |
| `datasets` | CRUD datasets, feature queries, spatial metadata |
| `upload` | Multipart file upload, ETL orchestration (GDAL → PostGIS) |
| `tiles` | Auth-protected proxy to Martin/TiTiler/GeoServer |
| `tenant` | Per-organization PostgreSQL schema isolation |

### Multi-Tenancy

- `public` schema holds `organizations` and `users` lookup tables
- Each tenant gets `tenant_<slug>` schema with `datasets`, `layers`, `etl_jobs` tables
- JWT from Keycloak carries `org_id` and `org_slug` → middleware sets tenant context
- All SQL queries scoped to tenant schema via `SET search_path`

## Tech Stack

| Category | Technology |
|----------|-----------|
| Backend | Node.js 22, TypeScript, Fastify 5 |
| Frontend | React 19, Vite 6, Tailwind CSS, TanStack Query |
| Map | MapLibre GL JS 4, react-map-gl 7 |
| Database | PostgreSQL 16, PostGIS 3.4 |
| Auth | Keycloak 25 (OAuth2/OIDC) |
| Tile Services | Martin (Rust), TiTiler (Python), GeoServer (Java) |
| Storage | MinIO (S3-compatible) |
| ETL | GDAL CLI (`ogrinfo`, `ogr2ogr`) |
| Infra | Docker Compose, 8 services |
| Testing | Vitest, React Testing Library |

## Quick Start

### Prerequisites

- Docker Engine 24+
- 4 GB RAM available
- Node.js 22 (for local dev without Docker)

### Setup

```bash
# Clone
git clone git@github.com:faisalaffan/geostack.git
cd geostack

# Configure environment
cp .env.example .env

# Start all 8 services
docker compose up -d

# Run database migrations
docker compose exec api npm run db:migrate
```

Open **http://localhost:5173** and login with the dev mode button, or **http://localhost:8081/admin** for Keycloak admin (`admin` / `admin`).

### Demo Credentials

| Platform | URL | Username | Password |
|----------|-----|----------|----------|
| Frontend | http://localhost:5173 | — | — |
| Keycloak Admin | http://localhost:8081/admin | `admin` | `admin` |
| MinIO Console | http://localhost:9001 | `minioadmin` | `minioadmin` |
| GeoServer | http://localhost:8080/geoserver | `admin` | `geoserver` |

### Seed Data

Sample Indonesian cell towers and fiber routes are auto-loaded on first start. Navigate to Dashboard → Map Viewer to see them.

## Development

```bash
# Backend (from backend/)
pnpm dev                 # Start with hot reload (requires Docker services up)
pnpm test                # Run tests
pnpm db:migrate          # Run migrations
npx tsc --noEmit         # Type check

# Frontend (from frontend/)
pnpm dev                 # Vite dev server with HMR
pnpm test                # Run tests
npx tsc --noEmit         # Type check
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/api/v1/auth/login` | Dev login (returns JWT) |
| `GET` | `/api/v1/auth/me` | Current user info |
| `GET` | `/api/v1/datasets` | List datasets (tenant-scoped) |
| `POST` | `/api/v1/datasets` | Create dataset |
| `GET` | `/api/v1/datasets/:id` | Dataset detail |
| `DELETE` | `/api/v1/datasets/:id` | Delete dataset |
| `GET` | `/api/v1/datasets/:id/features` | Query features (paginated) |
| `POST` | `/api/v1/upload/:datasetId` | Upload file (multipart) |
| `GET` | `/api/v1/tiles/vector/:z/:x/:y` | Vector tile (Martin proxy) |
| `GET` | `/api/v1/tiles/raster/:z/:x/:y` | Raster tile (TiTiler proxy) |
| `*` | `/api/v1/geoserver/*` | GeoServer proxy (WMS/WFS) |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_USER` | `geostack` | PostgreSQL user |
| `POSTGRES_PASSWORD` | `geostack_dev` | PostgreSQL password |
| `POSTGRES_DB` | `geostack` | PostgreSQL database |
| `API_PORT` | `3000` | Backend API port |
| `JWT_ISSUER` | `http://keycloak:8081/realms/geostack` | JWT issuer URL |
| `MINIO_ROOT_USER` | `minioadmin` | MinIO access key |
| `MINIO_ROOT_PASSWORD` | `minioadmin` | MinIO secret key |
| `MINIO_BUCKET` | `geostack-data` | Default S3 bucket |
| `KEYCLOAK_ADMIN` | `admin` | Keycloak admin user |
| `KEYCLOAK_ADMIN_PASSWORD` | `admin` | Keycloak admin password |

## Resource Budget (4 GB VPS)

| Service | Est. RAM | Notes |
|---------|----------|-------|
| PostgreSQL | 350 MB | `shared_buffers=128MB` |
| API | 200 MB | Node.js + GDAL |
| Frontend | 200 MB | Vite dev |
| Martin | 100 MB | Rust |
| TiTiler | 250 MB | Python |
| GeoServer | 500 MB | `-Xmx512m` |
| Keycloak | 350 MB | `-Xmx384m` |
| MinIO | 200 MB | Go |
| **Total** | **~2.15 GB** | 1.85 GB headroom |

## Project Status

- [x] Multi-tenant auth (Keycloak + JWT)
- [x] Dataset CRUD with spatial metadata
- [x] File upload & ETL pipeline (GDAL → PostGIS)
- [x] Vector tile serving (Martin)
- [x] Raster tile serving (TiTiler)
- [x] OGC standards (GeoServer WMS/WFS)
- [x] Interactive map viewer (MapLibre GL)
- [x] Backend tests
- [x] Frontend tests
- [ ] Real-time ETL progress (WebSocket)
- [ ] Kubernetes manifests
- [ ] CI/CD pipeline
