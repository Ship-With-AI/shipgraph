import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import dts from 'vite-plugin-dts';

// Library build: ESM + .d.ts. `vue` and `@shipgraph/core` stay external so the
// wrapper is a thin binding and consumers dedupe both.
export default defineConfig({
  plugins: [vue(), dts({ include: ['src'], insertTypesEntry: true })],
  build: {
    lib: {
      entry: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
      formats: ['es'],
      fileName: () => 'index.js',
    },
    rollupOptions: {
      external: ['vue', '@shipgraph/core'],
    },
    sourcemap: true,
    emptyOutDir: true,
  },
});
