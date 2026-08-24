# @shipgraph/vue

Vue 3 binding for [shipgraph](https://github.com/Ship-With-AI/shipgraph) — a
thin, reactive `<ShipGraph>` component over
[`@shipgraph/core`](../core). The public props and emits are **engine-agnostic**:
no `force-graph` type reaches this package's surface. SSR/Nuxt-safe by
construction — the Canvas 2D engine is loaded client-only.

## Install

```sh
npm i @shipgraph/vue @shipgraph/core vue
```

## Usage

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { ShipGraph } from '@shipgraph/vue';
import type { RawGraph } from '@shipgraph/vue';

const data = ref<RawGraph>(/* your graph.json */);
const filters = ref<string[] | null>(null);
const focus = ref<string | null>(null);
</script>

<template>
  <ShipGraph
    :data="data"
    :filters="filters"
    :focus="focus"
    @node="(id) => console.log('clicked node', id)"
    @link="(link) => console.log('clicked link', link)"
    @hover="(id) => console.log('hover', id)"
    @focus="(id) => console.log('focused', id)"
  />
</template>
```

### Nuxt

The component is SSR-safe (it never touches `window`/`document` during server
render), but the graph only mounts on the client. Wrap in `<ClientOnly>` to skip
the server render entirely:

```vue
<ClientOnly>
  <ShipGraph :data="data" />
</ClientOnly>
```

## Props (all reactive unless noted)

| Prop            | Type                          | Default | Notes                                        |
| --------------- | ----------------------------- | ------- | -------------------------------------------- |
| `data`          | `RawGraph \| GraphData`       | —       | Raw `graph.json` or canonical data. Required. |
| `filters`       | `string[] \| null`            | `null`  | Active relation classes; null/empty = all.    |
| `focus`         | `string \| null`              | `null`  | Node id to ease the camera to.                |
| `reducedMotion` | `boolean`                     | —       | Force the prefers-reduced-motion path.        |
| `draggable`     | `boolean`                     | —       | Node dragging with spring-back.               |
| `options`       | `ShipGraphOptions`            | —       | One-time construction options (not reactive). |

## Emits

| Event   | Payload             | When                                  |
| ------- | ------------------- | ------------------------------------- |
| `node`  | `string`            | A node was clicked.                   |
| `link`  | `GraphLink`         | A link was clicked (id endpoints).    |
| `hover` | `string \| null`    | Hovered node id, or null on leave.    |
| `focus` | `string`            | A node was focused (camera easing).   |
| `ready` | `ShipGraphInstance` | The core instance is mounted + ready. |

## Feel bar

Everything the core provides, driven through the component: physics elasticity,
1-hop hover halo, eased focus/zoom, expand/collapse, spring-back drag, and the
`prefers-reduced-motion` path.

## Scripts

- `npm run build` — type-check (`vue-tsc`) + bundle to ESM + `.d.ts`.
- `npm test` — vitest component tests (mount, prop reactivity, emits) under jsdom.
- `npm run demo` — dev server on the real `graph.json` (port 5191).
- `npm run perf` — headless puppeteer perf harness → `demo/perf-results.json` + screenshots.
