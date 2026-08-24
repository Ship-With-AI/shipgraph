import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// Serves the demo against the TypeScript source of @shipgraph/vue so the public
// component is exercised exactly as a consumer would. graph.json is served from
// the core demo's public dir — one copy of the real dataset for the whole repo.
export default defineConfig({
  root: __dirname,
  plugins: [vue()],
  publicDir: resolve(__dirname, '../../core/demo/public'),
  server: { port: 5191, strictPort: true },
});
