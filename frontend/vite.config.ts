import path from 'node:path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // Subruta de publicación (p. ej. '/financial-management/' en GitHub Pages).
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, 'src') },
  },
  server: {
    port: 3000,
    // En desarrollo la API se sirve por el mismo origen: la cookie httponly de refresh funciona sin CORS.
    proxy: { '/api': { target: 'http://localhost:5000', changeOrigin: true } },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
