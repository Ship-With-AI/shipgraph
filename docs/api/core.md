# API reference · @shipgraph/core

Complete public surface of `@shipgraph/core`. Everything here is exported from
the package entry; no concrete-engine (`force-graph`) type appears in any
signature.

## Factory functions

### `createGraph(container, data?, options?)`

```ts
function createGraph(
  container: HTMLElement,
  data?: RawGraph | GraphData,
  options?: ShipGraphOptions,
): ShipGraph;
```

Mount a graph into `container` (must have a non-zero size). `data` accepts raw
`graph.json` or canonical `GraphData`; omit it and call `setData` later. Returns
a [`ShipGraph`](#shipgraph) instance.

### `createGraphWithEngine(container, engine, data?, options?)`

```ts
function createGraphWithEngine(
  container: HTMLElement,
  engine: GraphEngine,
  data?: RawGraph | GraphData,
  options?: ShipGraphOptions,
): ShipGraph;
```

Compose the feel layer over a custom [`GraphEngine`](#engine-seam)
implementation (advanced / testing). Still engine-agnostic — `engine` is typed
as the seam interface, not a concrete class.

## `ShipGraph`

The instance returned by the factory. Every method is engine-agnostic.

### Data

| Method | Signature | Description |
| --- | --- | --- |
| `setData` | `(data: RawGraph \| GraphData) => void` | Replace the graph data (raw or canonical). |
| `getData` | `() => GraphData` | Current canonical data (respects active filters/collapse). |
| `getFullData` | `() => GraphData` | The full, unfiltered dataset. |

### Camera & feel

| Method | Signature | Description |
| --- | --- | --- |
| `focus` | `(nodeId: string) => void` | Ease the camera to center + zoom a node. |
| `fit` | `(ms?: number) => void` | Fit the whole visible graph in view. |
| `hoverHalo` | `(nodeId: string \| null) => void` | Drive the 1-hop hover halo (null clears). |
| `setDraggable` | `(on: boolean) => void` | Enable/disable spring-back node dragging. |
| `setReducedMotion` | `(on: boolean) => void` | Toggle the reduced-motion path at runtime. |
| `reheat` | `() => void` | Re-energize the physics simulation. |

### Edge-type filters

| Method | Signature | Description |
| --- | --- | --- |
| `setFilters` | `(relations: string[] \| null) => void` | Restrict to these relation classes (inclusion); null/empty restores all. |
| `getRelations` | `() => string[]` | All relation classes in the full dataset (sorted). |
| `toggleRelation` | `(relation: string, visible?: boolean) => void` | Hide/show a relation class live (flips when `visible` omitted). Independent of `setFilters`. |
| `getHiddenRelations` | `() => string[]` | Relation classes currently hidden by `toggleRelation` (sorted). |

### Community / family focus

| Method | Signature | Description |
| --- | --- | --- |
| `focusCommunity` | `(community: number \| null) => void` | Isolate + highlight a community; dim the rest. Null clears. |
| `getFocusedCommunity` | `() => number \| null` | The focused community, or null. |
| `getHighlightedNodes` | `() => string[]` | Node ids highlighted by the active community focus. |
| `isDimmed` | `(nodeId: string) => boolean` | True when a community focus is active and this node is not a member. |

### Expand / collapse

| Method | Signature | Description |
| --- | --- | --- |
| `collapse` | `(nodeId: string) => void` | Hide neighbors that hang solely off this node. |
| `expand` | `(nodeId: string) => void` | Restore neighbors previously hidden by collapsing. |
| `isCollapsed` | `(nodeId: string) => boolean` | Whether the node is collapsed. |

### Events & teardown

| Method | Signature | Description |
| --- | --- | --- |
| `on` | `<E extends ShipGraphEvent>(event: E, handler: (payload: ShipGraphEventMap[E]) => void) => () => void` | Subscribe; returns an unsubscribe function. |
| `destroy` | `() => void` | Tear down the instance and release the container. |

## Events

`ShipGraphEvent` is one of:

```ts
type ShipGraphEvent =
  | 'hover' | 'click' | 'linkhover' | 'linkclick'
  | 'focus' | 'settle' | 'dragend' | 'frame';
```

Payloads (`ShipGraphEventMap`):

| Event | Payload | When |
| --- | --- | --- |
| `hover` | `string \| null` | Node hover; null clears. |
| `click` | `string` | Node clicked. |
| `linkhover` | `GraphLink \| null` | Link hover; null clears. |
| `linkclick` | `GraphLink` | Link clicked. |
| `focus` | `string` | A node was focused (camera easing begins). |
| `settle` | `void` | Layout settled. |
| `dragend` | `string` | A node drag ended. |
| `frame` | `void` | Fires before each render frame (drive perf HUDs / overlays). |

## Options

### `ShipGraphOptions`

| Field | Type | Default | Notes |
| --- | --- | --- | --- |
| `backgroundColor` | `string` | `"#0b0f14"` | Canvas background color. |
| `physics` | `PhysicsOptions` | — | Physics tuning (below). |
| `focusTransitionMs` | `number` | `700` | Eased focus/zoom duration. |
| `focusZoom` | `number` | `4` | Zoom level applied on `focus()`. |
| `respectReducedMotion` | `boolean` | `true` | Honor `prefers-reduced-motion` (drops easing to 0ms). |
| `draggable` | `boolean` | `true` | Allow node dragging with spring-back. |
| `reducedMotion` | `boolean` | — | Force the preference explicitly (tests/SSR); else `matchMedia` is used. |

### `PhysicsOptions`

| Field | Type | Default | Notes |
| --- | --- | --- | --- |
| `chargeStrength` | `number` | `-140` | Repulsion strength (negative = repel). |
| `chargeDistanceMax` | `number` | `420` | Max distance repulsion acts over. |
| `linkDistanceBase` | `number` | `30` | Base link rest distance (px). |
| `linkDistanceSpread` | `number` | `40` | Extra rest distance scaled by `(1 - weight)`. |
| `linkStrength` | `number` | `0.5` | Link spring stiffness (0..1). |

## Data types

```ts
interface GraphNode {
  id: string;
  label: string;
  type: string | null;          // original file_type
  community: number | null;
  communityName: string | null;
  degree: number;               // computed by the adapter
}

interface GraphLink {
  source: string;               // node id
  target: string;               // node id
  relation: string;             // e.g. "references"
  weight: number;               // normalized 0..1, defaults 0.5
}

interface GraphData { nodes: GraphNode[]; links: GraphLink[]; }
```

Raw ingest schema (StackMap `graph.json`) — extra fields tolerated and ignored:

```ts
interface RawNode {
  id: string;
  label: string;
  file_type?: string | null;
  community?: number | null;
  community_name?: string | null;
  [k: string]: unknown;
}
interface RawLink {
  source: string; target: string; relation: string;
  weight?: number | null;
  [k: string]: unknown;
}
interface RawGraph { nodes: RawNode[]; links: RawLink[]; [k: string]: unknown; }
```

## Data adapter

| Function | Signature | Description |
| --- | --- | --- |
| `adapt` | `(raw: RawGraph) => GraphData` | Map raw `graph.json` to canonical data. |
| `toGraphData` | `(data: RawGraph \| GraphData) => GraphData` | Accept either shape; return canonical with degrees recomputed. |
| `isGraphData` | `(data: RawGraph \| GraphData) => data is GraphData` | Type guard: already-canonical data. |

The mapping:

- `file_type` → `type`, `community_name` → `communityName`.
- `weight` defaults to `0.5` when absent/null.
- Dangling links (endpoint missing from the node set) are dropped.
- `degree` is computed from the surviving links.

## Graph ops (pure helpers)

Side-effect-free operations shared by the feel layer, exported for advanced use:

| Function | Signature |
| --- | --- |
| `buildAdjacency` | `(data: GraphData) => Map<string, Set<string>>` |
| `relationsOf` | `(data: GraphData) => string[]` |
| `applyView` | `(full: GraphData, relations: string[] \| null, hidden: ReadonlySet<string>, hiddenRelations?: ReadonlySet<string>) => GraphData` |
| `communityMembers` | `(data: GraphData, community: number \| null) => string[]` |
| `collapseTargets` | `(nodeId: string, adj: Map<string, Set<string>>, visible: ReadonlySet<string>) => string[]` |
| `endpointId` | `(end: unknown) => string` |

## Engine seam

The rendering/physics contract shipgraph talks to. Engine-agnostic by contract —
supply your own via `createGraphWithEngine`.

Exported types: `GraphEngine`, `RenderNode`, `EnginePhysics`, `NodeRenderer`,
`LinkColorFn`, `LinkWidthFn`.

```ts
type NodeRenderer = (node: RenderNode, ctx: CanvasRenderingContext2D, globalScale: number) => void;
type LinkColorFn = (link: GraphLink, sourceId: string, targetId: string) => string;
type LinkWidthFn = (link: GraphLink, sourceId: string, targetId: string) => number;
```

`GraphEngine` covers mount/data, physics, camera (`centerAt`, `zoom`,
`zoomToFit`), node position/pinning/drag, style resolvers, event hooks
(`onNodeHover`, `onNodeClick`, `onLinkClick`, `onRenderFramePre`,
`onEngineStop`, …), and `destroy`. See
[`src/engine/types.ts`](https://github.com/Ship-With-AI/shipgraph/blob/main/packages/core/src/engine/types.ts)
for the full interface.
