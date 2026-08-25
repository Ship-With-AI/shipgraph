# @shipgraph/svelte

Svelte 5 binding for [shipgraph](https://github.com/Ship-With-AI/shipgraph) — a
thin, prop-reactive `<ShipGraph>` component over
[`@shipgraph/core`](../core). The public props and events are
**engine-agnostic**: no `force-graph` type reaches this package's surface.
SSR-safe by construction — the Canvas 2D engine is loaded client-only inside
`onMount`, so it never runs during server render.

## Install

```sh
pnpm add @shipgraph/svelte @shipgraph/core svelte
```

## Usage

```svelte
<script lang="ts">
  import { ShipGraph } from '@shipgraph/svelte';
  import type { RawGraph } from '@shipgraph/svelte';

  let data: RawGraph = /* your graph.json */;
  let filters: string[] | null = $state(null);
  let focus: string | null = $state(null);
</script>

<ShipGraph
  {data}
  {filters}
  {focus}
  onNode={(id) => console.log('clicked node', id)}
  onLink={(link) => console.log('clicked link', link)}
  onHover={(id) => console.log('hover', id)}
  onFocus={(id) => console.log('focused', id)}
  onReady={(g) => g.fit()}
/>
```

### SSR (SvelteKit)

The component renders only the container + accessible node list on the server;
the graph mounts on the client. Nothing touches `window`/`document` at module
scope, so it cannot crash SSR — no `<svelte:head>` guard or `browser` check is
required at the call site.

## Props (all reactive unless noted)

| Prop              | Type                    | Default | Notes                                                  |
| ----------------- | ----------------------- | ------- | ------------------------------------------------------ |
| `data`            | `RawGraph \| GraphData` | —       | Raw `graph.json` or canonical data. Required.          |
| `filters`         | `string[] \| null`      | `null`  | Active relation classes (inclusion); null/empty = all. |
| `hiddenRelations` | `string[] \| null`      | `null`  | Relation classes hidden live (exclusion toggle).       |
| `focus`           | `string \| null`        | `null`  | Node id to ease the camera to.                         |
| `focusCommunity`  | `number \| null`        | `null`  | Community/family to isolate + highlight.               |
| `reducedMotion`   | `boolean`               | —       | Force the prefers-reduced-motion path.                 |
| `draggable`       | `boolean`               | —       | Node dragging with spring-back.                        |
| `deepLink`        | `boolean`               | `true`  | Read the deep-link query param on mount (client-only). |
| `deepLinkParam`   | `string`                | `focus` | Query param name for the deep link.                    |
| `ariaLabel`       | `string`                | `Interactive graph visualization` | Accessible label for the region.    |
| `options`         | `ShipGraphOptions`      | —       | One-time construction options (not reactive).          |

## Events (callback props)

Idiomatic Svelte 5 callback props (no `createEventDispatcher`):

| Prop      | Payload             | When                                  |
| --------- | ------------------- | ------------------------------------- |
| `onNode`  | `string`            | A node was clicked.                   |
| `onLink`  | `GraphLink`         | A link was clicked (id endpoints).    |
| `onHover` | `string \| null`    | Hovered node id, or null on leave.    |
| `onFocus` | `string`            | A node was focused (camera easing).   |
| `onReady` | `ShipGraphInstance` | The core instance is mounted + ready. |

## Feel bar

Everything the core provides, driven through the component: physics elasticity,
1-hop hover halo, eased focus/zoom, expand/collapse, spring-back drag, and the
`prefers-reduced-motion` path.

## Deep links (`?focus=<slug>`)

On mount (client-only, SSR-safe) the component reads `?focus=<node-id>` from the
URL and centers + focuses that node. The param name is configurable via
`deepLinkParam`, and an explicit `focus` prop always wins over the URL. Set
`deepLink={false}` to opt out.

## Accessibility

The graph is keyboard- and screen-reader-usable without a mouse:

- The canvas region is focusable (`tabindex=0`, `role="application"`). Arrow keys
  traverse nodes, `Home`/`End` jump to first/last, and `Enter` focuses the
  current node — each move eases the camera to that node.
- A visually-hidden `<ul>` renders one accessible entry per node. Activating an
  entry focuses its node. An `aria-live` region announces the focused node.

## Scripts

- `pnpm build` — type-check (`svelte-check`) + package to ESM + `.d.ts`
  (`svelte-package`).
- `pnpm test` — vitest + @testing-library/svelte component tests (mount, prop
  reactivity, events, parity features, a11y) under jsdom.
