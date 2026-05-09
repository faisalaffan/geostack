# Geostack

Multi-tenant geospatial data platform for telecommunications network planning.

**Live demo:** [geostack.faisalaffan.com](https://geostack.faisalaffan.com) — login with `demo_admin` / `demo123`

## Features

- **Multi-tenant isolation** — Per-organization PostgreSQL schema, Keycloak realm, JWT auth
- **Spatial ETL** — Upload shapefiles/GeoJSON/GeoTIFF, auto-process via GDAL, load to PostGIS
- **Tile serving** — Vector (Martin), raster (TiTiler), OGC standards (GeoServer)
- **Interactive map** — MapLibre GL JS with layer toggles, click popups, attribute tables
- **Object storage** — MinIO S3-compatible

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

## Quick Start

```bash
git clone git@github.com:faisalaffan/geostack.git && cd geostack
cp .env.example .env
make setup        # install + start + migrate
```

Open http://localhost:5173. Dev login available on the frontend.

Keycloak admin at http://localhost:8081/admin (`admin` / `admin`).

## Tech Stack

| Category | Technology |
|----------|-----------|
| Backend | Node.js, TypeScript, Fastify |
| Frontend | React, Vite, Tailwind CSS, MapLibre GL JS |
| Database | PostgreSQL 16 + PostGIS 3.4 |
| Auth | Keycloak (OAuth2/OIDC) |
| Tile Services | Martin, TiTiler, GeoServer |
| Storage | MinIO (S3-compatible) |
| Infra | Docker Compose (8 services), Kubernetes manifests |

## Development

```bash
make help          # all commands

# Backend (backend/)
pnpm dev           # dev server (needs Docker services up)
pnpm test

# Frontend (frontend/)
pnpm dev           # Vite HMR
pnpm test
```

## License

MIT
