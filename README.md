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
