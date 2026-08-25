# Installation

Pick the package for your stack. Every binding depends on `@shipgraph/core`;
install it alongside the binding plus your framework as peer deps.

::: tip All packages are ESM
shipgraph ships ESM + type declarations only. Use a bundler (Vite, webpack,
Rollup, etc.) or native ESM. There is no CommonJS build.
:::

## Core (framework-agnostic)

```sh
pnpm add @shipgraph/core
```

No framework required — mount into any `HTMLElement`. See the
[core quick start](/guide/core).

## Vue 3

```sh
pnpm add @shipgraph/vue @shipgraph/core vue
```

`vue@^3.3.0` is a peer dependency. SSR/Nuxt-safe. See the
[Vue quick start](/guide/vue).

## React

```sh
pnpm add @shipgraph/react @shipgraph/core react react-dom
```

`react`/`react-dom` (`>=17`) are peer dependencies. SSR-safe (Next.js / Remix).
See the [React quick start](/guide/react).

## Svelte 5

```sh
pnpm add @shipgraph/svelte @shipgraph/core svelte
```

`svelte@^5.0.0` is a peer dependency. SSR-safe (SvelteKit). See the
[Svelte quick start](/guide/svelte).

## Data

Every binding and the core accept **either** StackMap's raw `graph.json` schema
**or** shipgraph's canonical `GraphData` — the adapter maps raw data in
automatically:

```jsonc
// raw graph.json (fed in verbatim; extra fields are ignored)
{
  "nodes": [
    { "id": "repos_langgraph", "label": "LangGraph", "file_type": "repo",
      "community": 3, "community_name": "Agent frameworks" }
  ],
  "links": [
    { "source": "repos_langgraph", "target": "docs_intro",
      "relation": "references", "weight": 0.8 }
  ]
}
```

See the [core data adapter](/api/core#data-adapter) for the exact mapping.
