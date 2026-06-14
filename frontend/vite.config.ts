import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    allowedHosts: ['geostack.faisalaffan.com', '.faisalaffan.com', 'geostack.local', '.local', 'localhost'],
    proxy: {
      // ETL upload → VPS (has GDAL)
      '/api/v1/upload': {
        target: process.env.VITE_ETL_PROXY || 'http://localhost:3009',
        changeOrigin: true,
      },
      '/api/v1/ws/etl': {
        target: process.env.VITE_ETL_PROXY || 'http://localhost:3009',
        changeOrigin: true,
        ws: true,
      },
      // Everything else → local backend
      '/api': {
        target: process.env.VITE_PROXY_TARGET || 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
