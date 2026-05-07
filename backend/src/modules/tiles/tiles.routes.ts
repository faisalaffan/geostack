import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Config } from '../../config.js';

declare module 'fastify' {
  interface FastifyInstance {
    config: Config;
  }
}

export async function tileRoutes(app: FastifyInstance) {
  // Vector tiles via Martin
  app.get('/tiles/vector/:z/:x/:y', async (request: FastifyRequest, reply: FastifyReply) => {
    const { z, x, y } = request.params as { z: string; x: string; y: string };
    const config = app.config;

    const url = new URL(`${config.MARTIN_URL}/${request.tenantSchema}.layers/${z}/${x}/${y}`);
    const response = await fetch(url.toString());

    reply
      .header('Content-Type', response.headers.get('content-type') || 'application/x-protobuf')
      .header('Content-Encoding', response.headers.get('content-encoding') || '')
      .header('Cache-Control', 'public, max-age=3600');

    if (response.status === 204) return reply.status(204).send();

    const buffer = Buffer.from(await response.arrayBuffer());
    return reply.send(buffer);
  });

  // Raster tiles via TiTiler
  app.get('/tiles/raster/:z/:x/:y', async (request: FastifyRequest, reply: FastifyReply) => {
    const { z, x, y } = request.params as { z: string; x: string; y: string };
    const config = app.config;

    const url = new URL(`${config.TITILER_URL}/cog/tiles/WebMercatorQuad/${z}/${x}/${y}`);
    const response = await fetch(url.toString());

    reply
      .header('Content-Type', response.headers.get('content-type') || 'image/png')
      .header('Cache-Control', 'public, max-age=3600');

    if (response.status === 204) return reply.status(204).send();

    const buffer = Buffer.from(await response.arrayBuffer());
    return reply.send(buffer);
  });

  // GeoServer proxy (WMS/WFS/WMTS)
  app.all('/geoserver/*', async (request: FastifyRequest, reply: FastifyReply) => {
    const config = app.config;
    const targetPath = request.url.replace('/api/v1/geoserver', '/geoserver');
    const url = new URL(`${config.GEOSERVER_URL}${targetPath}`);

    const response = await fetch(url.toString(), {
      method: request.method,
      headers: { 'Content-Type': request.headers['content-type'] || 'application/xml' },
      body: request.method !== 'GET' && request.method !== 'HEAD'
        ? JSON.stringify(request.body)
        : undefined,
    });

    reply.header('Content-Type', response.headers.get('content-type') || 'application/octet-stream');

    const buffer = Buffer.from(await response.arrayBuffer());
    return reply.send(buffer);
  });
}
