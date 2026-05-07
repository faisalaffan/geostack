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
