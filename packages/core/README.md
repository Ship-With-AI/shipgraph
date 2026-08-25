# @shipgraph/core

Framework-agnostic graph visualization core. It owns a shipgraph public API and
the NVL-grade *feel* primitives, wrapping the MIT [`force-graph`][fg] engine
(Canvas 2D + d3-force) behind an **engine seam** so the rendering/physics
backend can be swapped (e.g. a WebGL backend past ~10k nodes) without touching
the public API or any framework wrapper.

Zero framework dependencies. Ships ESM + type declarations.

## Install

```sh
pnpm add @shipgraph/core
```

## Quick start

```ts
import { createGraph } from '@shipgraph/core';

// `data` accepts raw StackMap `graph.json` or canonical GraphData.
const graph = createGraph(document.getElementById('graph')!, rawGraphJson, {
  focusZoom: 4,
  physics: { chargeStrength: -140, linkStrength: 0.5 },
});

graph.on('hover', (id) => console.log('hovering', id));
graph.focus('repos_langgraph');       // eased center + zoom
graph.setFilters(['references']);      // live edge-type filter (inclusion)
graph.toggleRelation('references');    // hide/show a relation class live
graph.focusCommunity(3);               // isolate + highlight a community, dim rest
graph.collapse('repos_langgraph');     // hide leaf neighbors
graph.setReducedMotion(true);          // drop easing / bounce
```

## Public API (engine-agnostic)

`createGraph(container, data?, options?) => ShipGraph`

| Method | Feel primitive |
| --- | --- |
| `focus(id)` | eased click-to-focus camera (`focusTransitionMs`, `focusZoom`) |
| `hoverHalo(id \| null)` | 1-hop neighborhood halo (neighbors highlighted, rest dimmed) |
| `setFilters(relations \| null)` | live relation-class filtering (inclusion) |
| `toggleRelation(relation, visible?)` | hide/show a relation class live (exclusion toggle) |
| `focusCommunity(community \| null)` | isolate + highlight a community/family, dim the rest |
| `collapse(id)` / `expand(id)` | hide/restore leaf neighbors |
| `setDraggable(on)` | spring-back drag (pin while dragging, reheat on release) |
| `setReducedMotion(on)` | `prefers-reduced-motion` path (0ms easing, instant settle) |
| `fit(ms?)`, `reheat()`, `setData()`, `getData()`, `getFullData()`, `getRelations()`, `getHiddenRelations()`, `getFocusedCommunity()`, `getHighlightedNodes()`, `isDimmed(id)` | — |
| `on(event, cb)` | `hover` · `click` · `dragend` · `settle` · `frame` |

Physics ("elasticity") is tuned via `options.physics`: firm charge repulsion +
weight-scaled link springs — the NVL "bounce".

**No engine type leaks.** No `force-graph` type appears in any exported
signature — grep-verifiable against `dist/index.d.ts`. The only module that
imports `force-graph` is [`src/engine/forceGraphEngine.ts`](src/engine/forceGraphEngine.ts),
which implements the [`GraphEngine`](src/engine/types.ts) contract. Advanced
consumers can supply their own engine via `createGraphWithEngine`.

## Data adapter

`adapt(raw)` maps StackMap's real `graph.json` schema:

- nodes `{ id, label, file_type, community, community_name }`
  → `{ id, label, type, community, communityName, degree }`
- links `{ source, target, relation, weight }` → same, `weight` defaults to 0.5
- dangling links (endpoint missing from the node set) are dropped
- `degree` is computed from surviving links

## Scripts

```sh
pnpm build       # tsc --noEmit (typecheck) + tsup (ESM bundle + .d.ts)
pnpm test            # vitest unit tests (adapter + graph ops)
pnpm demo        # vite demo on real graph.json at http://localhost:5190
pnpm perf        # headless puppeteer perf harness -> demo/perf-results.json
```

## Performance

Measured headless (Chrome 131, puppeteer, swiftshader) via `pnpm perf` on
StackMap's real graph, driven entirely through the public API:

| Scale | Nodes / Links | Settled + interacting |
| --- | --- | --- |
| 1× | 645 / 755 | **60 fps** |
| 5× | 3225 / 3855 | **~60 fps** (steady interaction after ~10s settle) |

Numbers reproduce via `demo/perf-results.json`; screenshots in `demo/`. This
matches or beats the Phase-1 spike bar (60 fps @1×, ~57 fps settled @5×). The
active-simulation transient during the ~10s 5× layout settle is noisy under
software rendering (Phase-1 reported 35–43 fps); steady interactive state holds
60 fps.

[fg]: https://github.com/vasturiano/force-graph
