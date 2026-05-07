FROM node:22-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    gdal-bin \
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app
COPY backend/package.json backend/pnpm-lock.yaml backend/.npmrc ./
RUN pnpm install --no-frozen-lockfile
COPY backend/ .
EXPOSE 3000
CMD ["pnpm", "run", "dev"]
