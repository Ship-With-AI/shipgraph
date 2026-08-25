# API reference · @shipgraph/vue

Public surface of `@shipgraph/vue`: the `<ShipGraph>` component plus re-exported,
engine-agnostic [core types](/api/core).

## `<ShipGraph>`

```ts
import { ShipGraph } from '@shipgraph/vue';
```

### Props (all reactive unless noted)

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `data` | `RawGraph \| GraphData` | — | Raw `graph.json` or canonical data. **Required.** |
| `filters` | `string[] \| null` | `null` | Active relation classes (inclusion); null/empty = all. |
| `hiddenRelations` | `string[] \| null` | `null` | Relation classes hidden live (exclusion toggle). |
| `focus` | `string \| null` | `null` | Node id to ease the camera to. |
| `focusCommunity` | `number \| null` | `null` | Community/family to isolate + highlight (dims the rest). |
| `reducedMotion` | `boolean` | — | Force the prefers-reduced-motion path. |
| `draggable` | `boolean` | — | Node dragging with spring-back. |
| `deepLink` | `boolean` | `true` | Read the deep-link query param on mount (client-only). |
| `deepLinkParam` | `string` | `focus` | Query param name for the deep link. |
| `ariaLabel` | `string` | `Interactive graph visualization` | Accessible label for the graph region. |
| `options` | `ShipGraphOptions` | — | One-time construction options (not reactive). |

### Emits

| Event | Payload | When |
| --- | --- | --- |
| `node` | `string` | A node was clicked. |
| `link` | `GraphLink` | A link was clicked (id endpoints). |
| `hover` | `string \| null` | Hovered node id, or null on leave. |
| `focus` | `string` | A node was focused (camera easing). |
| `ready` | `ShipGraphInstance` | The core instance is mounted + ready. |

### Exposed methods (via template ref)

```ts
const el = ref<InstanceType<typeof ShipGraph>>();
el.value?.focusNode(id);                    // ease camera to a node
el.value?.toggleRelation(relation, visible?); // hide/show a relation class
el.value?.focusCommunity(community);        // isolate + highlight (null clears)
el.value?.graph;                            // the live core ShipGraph instance
```

`graph` is the full [core instance](/api/core#shipgraph) — reach for `fit()`,
`reheat()`, `collapse()`, etc.

## Deep links

On mount (client-only) the component reads `?focus=<node-id>` and focuses that
node. Configurable via `deepLinkParam`; an explicit `focus` prop always wins; set
`:deep-link="false"` to opt out.

## Accessibility

The canvas region is focusable (`tabindex=0`, `role="application"`). Arrow keys
traverse nodes, `Home`/`End` jump to first/last, `Enter` focuses the current
node. A visually-hidden `<ul>` lists every node (activating an entry focuses it),
and an `aria-live` region announces the focused node.

## Re-exported types

`GraphNode`, `GraphLink`, `GraphData`, `RawNode`, `RawLink`, `RawGraph`,
`PhysicsOptions`, `ShipGraphOptions`, `ShipGraphInstance` (the core `ShipGraph`),
`ShipGraphEvent`, `ShipGraphEventMap` — all from [`@shipgraph/core`](/api/core).
