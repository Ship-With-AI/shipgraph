import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { index: 'src/index.ts' },
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  treeshake: true,
  // The concrete engine stays external so it never bloats the core bundle and
  // consumers dedupe it with their own copy.
  external: ['force-graph'],
});
