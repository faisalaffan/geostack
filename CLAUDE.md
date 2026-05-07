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
