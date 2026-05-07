FROM node:22-slim

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app
COPY frontend/package.json frontend/pnpm-lock.yaml ./
ENV PNPM_HOME=/root/.local/share/pnpm
RUN pnpm config set onlyBuiltDependencies '["esbuild"]' --location project || true
RUN pnpm install --no-frozen-lockfile
COPY frontend/ .
EXPOSE 5173
CMD ["pnpm", "run", "dev", "--", "--host", "0.0.0.0"]
