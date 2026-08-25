import { resolve } from 'node:path';
import { defineConfig } from 'vitepress';

// Monorepo root (docs/.vitepress -> ../..).
const repoRoot = resolve(__dirname, '../..');

// Base path: project GitHub Pages serve under /<repo>/. The deploy workflow
// sets DOCS_BASE=/shipgraph/; local dev + preview default to root.
const base = process.env.DOCS_BASE || '/';
// The live demo (and its @shipgraph/vue import) is served straight from the
// TypeScript/SFC source of the workspace packages, so the docs exercise the
// exact public surface a consumer sees — and `pnpm dev` needs no prior
// package build. Same pattern the per-package demos use.
export default defineConfig({
  base,
  title: 'shipgraph',
  description:
    'NVL/Bloom-grade feel (springy physics, hover halos, eased focus camera) in an MIT, framework-agnostic graph visualization component. Core + Vue/React/Svelte bindings.',
  head: [['link', { rel: 'icon', type: 'image/svg+xml', href: `${base}favicon.svg` }]],
  lang: 'en-US',
  cleanUrls: true,
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/introduction' },
      { text: 'Live Demo', link: '/demo' },
      { text: 'API', link: '/api/core' },
      { text: 'GitHub', link: 'https://github.com/Ship-With-AI/shipgraph' },
    ],
    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Introduction', link: '/guide/introduction' },
          { text: 'Installation', link: '/guide/installation' },
        ],
      },
      {
        text: 'Quick start',
        items: [
          { text: '@shipgraph/core', link: '/guide/core' },
          { text: '@shipgraph/vue', link: '/guide/vue' },
          { text: '@shipgraph/react', link: '/guide/react' },
          { text: '@shipgraph/svelte', link: '/guide/svelte' },
        ],
      },
      { text: 'Live demo', link: '/demo' },
      {
        text: 'API reference',
        items: [
          { text: '@shipgraph/core', link: '/api/core' },
          { text: '@shipgraph/vue', link: '/api/vue' },
          { text: '@shipgraph/react', link: '/api/react' },
          { text: '@shipgraph/svelte', link: '/api/svelte' },
        ],
      },
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/Ship-With-AI/shipgraph' },
    ],
    search: { provider: 'local' },
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'shipgraph — ShipWithAI',
    },
  },
  vite: {
    resolve: {
      alias: {
        '@shipgraph/core': resolve(repoRoot, 'packages/core/src/index.ts'),
        '@shipgraph/vue': resolve(repoRoot, 'packages/vue/src/index.ts'),
      },
    },
    server: {
      port: 5199,
      strictPort: true,
      // Allow serving package sources that live outside docs/.
      fs: { allow: [repoRoot] },
    },
  },
});
