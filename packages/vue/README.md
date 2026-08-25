# @shipgraph/vue

Vue 3 binding for [shipgraph](https://github.com/Ship-With-AI/shipgraph) — a
thin, reactive `<ShipGraph>` component over
[`@shipgraph/core`](../core). The public props and emits are **engine-agnostic**:
no `force-graph` type reaches this package's surface. SSR/Nuxt-safe by
construction — the Canvas 2D engine is loaded client-only.

## Install

```sh
pnpm add @shipgraph/vue @shipgraph/core vue
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
| `filters`       | `string[] \| null`            | `null`  | Active relation classes (inclusion); null/empty = all. |
| `hiddenRelations` | `string[] \| null`          | `null`  | Relation classes hidden live (exclusion toggle). |
| `focus`         | `string \| null`              | `null`  | Node id to ease the camera to.                |
| `focusCommunity` | `number \| null`             | `null`  | Community/family to isolate + highlight (dims the rest). |
| `reducedMotion` | `boolean`                     | —       | Force the prefers-reduced-motion path.        |
| `draggable`     | `boolean`                     | —       | Node dragging with spring-back.               |
| `deepLink`      | `boolean`                     | `true`  | Read the deep-link query param on mount (client-only). |
| `deepLinkParam` | `string`                      | `focus` | Query param name for the deep link.           |
| `ariaLabel`     | `string`                      | `Interactive graph visualization` | Accessible label for the graph region. |
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

## Deep links (`?focus=<slug>`)

On mount (client-only, SSR-safe) the component reads `?focus=<node-id>` from the
URL and centers + focuses that node — so a graph can be shared pre-focused. The
param name is configurable via `deepLinkParam`, and an explicit `focus` prop
always wins over the URL. Set `deepLink="false"` to opt out.

## Accessibility

The graph is keyboard- and screen-reader-usable without a mouse:

- The canvas region is focusable (`tabindex=0`, `role="application"`). Arrow
  keys traverse nodes, `Home`/`End` jump to first/last, and `Enter` focuses the
  current node — each move eases the camera to that node.
- A visually-hidden `<ul>` renders one accessible entry per node (an ARIA-labeled
  list). Activating an entry focuses its node. An `aria-live` region announces
  the focused node for screen readers.

## Imperative methods (via template ref)

```ts
const el = ref<InstanceType<typeof ShipGraph>>();
el.value?.focusNode('repos_langgraph');
el.value?.toggleRelation('references');     // hide/show a relation class
el.value?.focusCommunity(3);                // isolate + highlight a community
el.value?.graph;                            // the live core instance (fit(), etc.)
```

## Scripts

- `pnpm build` — type-check (`vue-tsc`) + bundle to ESM + `.d.ts`.
- `pnpm test` — vitest component tests (mount, prop reactivity, emits) under jsdom.
- `pnpm demo` — dev server on the real `graph.json` (port 5191).
- `pnpm perf` — headless puppeteer perf harness → `demo/perf-results.json` + screenshots.
