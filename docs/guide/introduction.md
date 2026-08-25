# Introduction

**shipgraph** is a framework-agnostic graph visualization component with
NVL/Bloom-grade *feel* — springy physics, 1-hop hover halos, and an eased focus
camera — built on the MIT [`force-graph`][fg] engine (Canvas 2D + d3-force) and
shipped under the MIT license.

## Packages

| Package | What it is |
| --- | --- |
| [`@shipgraph/core`](/guide/core) | The framework-agnostic engine + public API + feel primitives. Zero framework deps. |
| [`@shipgraph/vue`](/guide/vue) | A reactive, SSR/Nuxt-safe `<ShipGraph>` Vue 3 component. |
| [`@shipgraph/react`](/guide/react) | An idiomatic `<ShipGraph>` component + `useShipGraph` hook. |
| [`@shipgraph/svelte`](/guide/svelte) | An idiomatic Svelte 5 `<ShipGraph>` component. |

The three bindings are **thin wrappers over the same core** — same feel bar,
same parity features, idiomatic in each framework. The concrete rendering engine
is hidden behind an *engine seam*, so no `force-graph` type appears in any
public signature and a WebGL backend can slot in later without touching consumer
code.

## Why it exists

Cytoscape + fcose renders graphs but feels flat. NVL and Bloom feel alive but
aren't MIT. shipgraph is the third option: the feel of NVL, the license of
Cytoscape, and no framework lock-in.

## The feel bar

Every binding drives the same primitives from the core:

- **Elastic physics** — firm charge repulsion + weight-scaled link springs (the
  NVL "bounce").
- **1-hop hover halo** — hovering a node highlights its neighbors and dims the
  rest.
- **Eased focus camera** — click (or `focus()`) to center + zoom with easing.
- **Spring-back drag** — pin while dragging, reheat on release.
- **`prefers-reduced-motion`** — a path that drops easing to instant.

## Feature parity

Everything StackMap's graph does, so migration loses nothing:

- **Edge-type filters** — toggle relation classes live.
- **Community / family focus** — isolate + highlight a community, dim the rest.
- **`?focus=<slug>` deep links** — share a graph pre-focused on a node.
- **Accessibility** — keyboard navigation + a screen-reader node list; usable
  without a mouse.

## Proven on real data

shipgraph is validated on StackMap's real `graph.json` (645 nodes / 755 links) —
the same dataset the [live demo](/demo) runs in your browser. Measured headless
(Chrome, puppeteer): **60 fps at 1×** and **~60 fps at 5×** (3225 / 3855).

Next: [Installation](/guide/installation).

[fg]: https://github.com/vasturiano/force-graph
