import { defineConfig } from 'vite';

// Serves the demo against the TypeScript source of @shipgraph/core so the
// public API is exercised exactly as a consumer would use it.
export default defineConfig({
  root: __dirname,
  server: { port: 5190, strictPort: true },
});
