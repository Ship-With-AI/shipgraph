import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

// Library build: ESM + .d.ts. React and @shipgraph/core stay external so the
// wrapper is a thin binding and consumers dedupe both. JSX compiles via the
// automatic runtime (no `import React` needed), matching modern React apps.
export default defineConfig({
  plugins: [dts({ include: ['src'], insertTypesEntry: true })],
  esbuild: { jsx: 'automatic', jsxImportSource: 'react' },
  build: {
    lib: {
      entry: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
      formats: ['es'],
      fileName: () => 'index.js',
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime', '@shipgraph/core'],
    },
    sourcemap: true,
    emptyOutDir: true,
  },
});
