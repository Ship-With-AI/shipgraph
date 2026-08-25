# Quick start · @shipgraph/core

The framework-agnostic core. Mount into any `HTMLElement`; drive every feel
primitive imperatively.

## Install

```sh
npm i @shipgraph/core
```

## Mount

```ts
import { createGraph } from '@shipgraph/core';
import type { RawGraph } from '@shipgraph/core';

const container = document.getElementById('graph')!; // must have a size
const raw = (await fetch('/graph.json').then((r) => r.json())) as RawGraph;

// `data` accepts raw StackMap `graph.json` OR canonical GraphData.
const graph = createGraph(container, raw, {
  focusZoom: 4,
  physics: { chargeStrength: -140, linkStrength: 0.5 },
});
```

::: warning Give the container a size
The engine fills its container. Ensure it has non-zero width/height (e.g.
`#graph { width: 100%; height: 600px; }`) before/at mount.
:::

## Drive the feel bar

```ts
// Eased click-to-focus camera (center + zoom).
graph.focus('repos_langgraph');

// 1-hop hover halo, driven programmatically (hover does this automatically).
graph.hoverHalo('repos_langgraph');
graph.hoverHalo(null); // clear

// Live edge-type filters.
graph.setFilters(['references']);     // inclusion: show only these relations
graph.toggleRelation('references');   // exclusion: hide/show one relation live

// Community / family focus: isolate + highlight, dim the rest.
graph.focusCommunity(3);
graph.focusCommunity(null);           // clear

// Expand / collapse leaf neighbors.
graph.collapse('repos_langgraph');
graph.expand('repos_langgraph');

// Motion + interaction.
graph.setDraggable(true);             // spring-back drag
graph.setReducedMotion(true);         // drop easing / bounce
graph.fit();                          // fit visible graph in view
```

## Events

```ts
const off = graph.on('hover', (id) => console.log('hovering', id));
graph.on('click', (id) => graph.focus(id));
graph.on('linkclick', (link) => console.log(link.source, '→', link.target));
graph.on('settle', () => console.log('layout settled'));

off();          // unsubscribe
graph.destroy(); // tear down + release the container
```

Full surface: [Core API reference](/api/core).
