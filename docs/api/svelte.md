# API reference · @shipgraph/svelte

Public surface of `@shipgraph/svelte`: the Svelte 5 `<ShipGraph>` component plus
re-exported, engine-agnostic [core types](/api/core).

## `<ShipGraph>`

```ts
import { ShipGraph } from '@shipgraph/svelte';
```

### Props (all reactive unless noted)

| Prop | Type | Default | Notes |
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
| `ariaLabel` | `string` | `Interactive graph visualization` | Accessible label for the region. |
| `options` | `ShipGraphOptions` | — | One-time construction options (not reactive). |

### Events (callback props)

Idiomatic Svelte 5 callback props — no `createEventDispatcher`:

| Prop | Payload | When |
| --- | --- | --- |
| `onNode` | `(id: string) => void` | A node was clicked. |
| `onLink` | `(link: GraphLink) => void` | A link was clicked (id endpoints). |
| `onHover` | `(id: string \| null) => void` | Hovered node id, or null on leave. |
| `onFocus` | `(id: string) => void` | A node was focused (camera easing). |
| `onReady` | `(graph: ShipGraphInstance) => void` | The core instance is mounted + ready. |

`onReady` hands you the full [core instance](/api/core#shipgraph) — `fit()`,
`reheat()`, `focusCommunity()`, `toggleRelation()`, `collapse()`, etc.

## Deep links

On mount (client-only) the component reads `?focus=<node-id>` and focuses that
node. Configurable via `deepLinkParam`; an explicit `focus` prop always wins; set
`deepLink={false}` to opt out.

## SSR (SvelteKit)

The component renders only the container + accessible node list on the server;
the graph mounts client-side inside `onMount`. Nothing touches
`window`/`document` at module scope, so it cannot crash SSR.

## Accessibility

The canvas region is focusable (`tabindex=0`, `role="application"`). Arrow keys
traverse nodes, `Home`/`End` jump to first/last, `Enter` focuses the current
node. A visually-hidden `<ul>` lists every node; an `aria-live` region announces
the focused node.

## Re-exported types

`GraphNode`, `GraphLink`, `GraphData`, `RawNode`, `RawLink`, `RawGraph`,
`PhysicsOptions`, `ShipGraphOptions`, `ShipGraphInstance` (the core `ShipGraph`),
`ShipGraphEvent`, `ShipGraphEventMap` — all from [`@shipgraph/core`](/api/core).
