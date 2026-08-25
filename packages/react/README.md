# @shipgraph/react

React binding for [shipgraph](https://github.com/Ship-With-AI/shipgraph) — a
thin, prop-reactive `<ShipGraph>` component (and a `useShipGraph` hook) over
[`@shipgraph/core`](../core). The public props and callbacks are
**engine-agnostic**: no `force-graph` type reaches this package's surface.
SSR-safe by construction — the Canvas 2D engine is loaded client-only inside an
effect, so it never runs during server render.

## Install

```sh
npm i @shipgraph/react @shipgraph/core react react-dom
```

## Usage

```tsx
import { useState } from 'react';
import { ShipGraph } from '@shipgraph/react';
import type { RawGraph } from '@shipgraph/react';

export function Graph({ graph }: { graph: RawGraph }) {
  const [filters, setFilters] = useState<string[] | null>(null);
  const [focus, setFocus] = useState<string | null>(null);
  return (
    <ShipGraph
      data={graph}
      filters={filters}
      focus={focus}
      onNode={(id) => console.log('clicked node', id)}
      onLink={(link) => console.log('clicked link', link)}
      onHover={(id) => console.log('hover', id)}
      onFocus={(id) => console.log('focused', id)}
      onReady={(g) => g.fit()}
    />
  );
}
```

### The hook

`useShipGraph` owns the whole lifecycle; `<ShipGraph>` is a thin view over it.
Reach for the hook to render your own container:

```tsx
import { useRef } from 'react';
import { useShipGraph } from '@shipgraph/react';

function Custom({ data }) {
  const ref = useRef<HTMLDivElement>(null);
  const { graph, focusNode, toggleRelation, focusCommunity } = useShipGraph(ref, { data });
  return <div ref={ref} style={{ width: '100%', height: 480 }} />;
}
```

### SSR (Next.js / Remix)

The component renders only the container + accessible node list on the server;
the graph mounts on the client. Nothing touches `window`/`document` at module
scope, so it cannot crash SSR. In the Next.js app router mark the consumer
`'use client'` (or `next/dynamic` with `ssr: false`) since it is interactive.

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
| `className`/`style` | —                     | —       | Passed to the root element.                            |

## Callbacks

| Prop      | Payload             | When                                  |
| --------- | ------------------- | ------------------------------------- |
| `onNode`  | `string`            | A node was clicked.                   |
| `onLink`  | `GraphLink`         | A link was clicked (id endpoints).    |
| `onHover` | `string \| null`    | Hovered node id, or null on leave.    |
| `onFocus` | `string`            | A node was focused (camera easing).   |
| `onReady` | `ShipGraphInstance` | The core instance is mounted + ready. |

Callbacks may be inline arrows — they are read through a latest-ref, so a new
identity every render never resubscribes the core.

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

- The canvas region is focusable (`tabIndex=0`, `role="application"`). Arrow keys
  traverse nodes, `Home`/`End` jump to first/last, and `Enter` focuses the
  current node — each move eases the camera to that node.
- A visually-hidden `<ul>` renders one accessible entry per node. Activating an
  entry focuses its node. An `aria-live` region announces the focused node.

## Scripts

- `npm run build` — type-check (`tsc`) + bundle to ESM + `.d.ts`.
- `npm test` — vitest + @testing-library/react component tests (mount, prop
  reactivity, callbacks, parity features, a11y) under jsdom.
