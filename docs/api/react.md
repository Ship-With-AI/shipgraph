# API reference · @shipgraph/react

Public surface of `@shipgraph/react`: the `<ShipGraph>` component, the
`useShipGraph` hook, and re-exported, engine-agnostic [core types](/api/core).

## `<ShipGraph>`

```ts
import { ShipGraph } from '@shipgraph/react';
import type { ShipGraphProps } from '@shipgraph/react';
```

`ShipGraphProps` extends [`UseShipGraphOptions`](#useshipgraphoptions) with:

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `ariaLabel` | `string` | `Interactive graph visualization` | Accessible label for the region. |
| `className` | `string` | — | Extra class on the root element. |
| `style` | `CSSProperties` | — | Extra style on the root element. |

## `useShipGraph`

```ts
function useShipGraph(
  ref: RefObject<HTMLElement>,
  options: UseShipGraphOptions,
): UseShipGraphResult;
```

Owns the whole lifecycle; `<ShipGraph>` is a thin view over it. Pass a ref to
your own container to drive it directly.

### `UseShipGraphOptions`

Props (all reactive unless noted):

| Field | Type | Default | Notes |
| --- | --- | --- | --- |
| `data` | `RawGraph \| GraphData` | — | Raw `graph.json` or canonical data. **Required.** |
| `filters` | `string[] \| null` | `null` | Active relation classes (inclusion); null/empty = all. |
| `hiddenRelations` | `string[] \| null` | `null` | Relation classes hidden live (exclusion toggle). |
| `focus` | `string \| null` | `null` | Node id to ease the camera to. |
| `focusCommunity` | `number \| null` | `null` | Community/family to isolate + highlight. |
| `reducedMotion` | `boolean` | — | Force the prefers-reduced-motion path. |
| `draggable` | `boolean` | — | Node dragging with spring-back. |
| `deepLink` | `boolean` | `true` | Read the deep-link query param on mount (client-only). |
| `deepLinkParam` | `string` | `focus` | Query param name for the deep link. |
| `options` | `ShipGraphOptions` | — | One-time construction options (not reactive). |
| `onNode` | `(id: string) => void` | — | A node was clicked. |
| `onLink` | `(link: GraphLink) => void` | — | A link was clicked (id endpoints). |
| `onHover` | `(id: string \| null) => void` | — | Hovered node id, or null on leave. |
| `onFocus` | `(id: string) => void` | — | A node was focused (camera easing). |
| `onReady` | `(graph: ShipGraphInstance) => void` | — | The core instance is mounted + ready. |

Callbacks are read through a latest-ref, so a new identity every render never
resubscribes the core.

### `UseShipGraphResult`

```ts
interface UseShipGraphResult {
  graph: ShipGraphInstance | null;                 // live core instance
  focusNode: (id: string) => void;                 // ease camera to a node
  toggleRelation: (relation: string, visible?: boolean) => void;
  focusCommunity: (community: number | null) => void;
}
```

`graph` is the full [core instance](/api/core#shipgraph) — `fit()`, `reheat()`,
`collapse()`, etc.

## SSR

The component renders only the container + accessible node list on the server;
the graph mounts client-side inside the hook's effect. Mark interactive
consumers `'use client'` in the Next.js app router.

## Accessibility

The canvas region is focusable (`tabIndex=0`, `role="application"`). Arrow keys
traverse nodes, `Home`/`End` jump to first/last, `Enter` focuses the current
node. A visually-hidden `<ul>` lists every node; an `aria-live` region announces
the focused node.

## Re-exported types

`GraphNode`, `GraphLink`, `GraphData`, `RawNode`, `RawLink`, `RawGraph`,
`PhysicsOptions`, `ShipGraphOptions`, `ShipGraphInstance` (the core `ShipGraph`),
`ShipGraphEvent`, `ShipGraphEventMap` — all from [`@shipgraph/core`](/api/core).
Plus `ShipGraphProps`, `UseShipGraphOptions`, `UseShipGraphResult`.
