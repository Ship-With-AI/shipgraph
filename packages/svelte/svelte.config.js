import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

// Enables lang="ts" inside .svelte files for both svelte-package (build) and
// the vite-plugin-svelte test runner.
export default {
  preprocess: vitePreprocess(),
};
