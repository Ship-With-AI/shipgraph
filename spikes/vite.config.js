import { defineConfig } from 'vite';

// public/graph.json is served at /graph.json in both dev and build.
export default defineConfig({
  server: { port: 5188, strictPort: true },
  preview: { port: 4173, strictPort: true },
});
