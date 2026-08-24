# shipgraph

## What This Is

shipgraph is a framework-agnostic, MIT-licensed graph-visualization component
that delivers Neo4j-NVL / Bloom-grade *feel* — physics elasticity, hover
1-hop neighborhood halos, smooth click-to-focus camera easing, expand/collapse,
spring-back node drag, and a reduced-motion path — to any web app. It ships as a
framework-agnostic TypeScript core plus thin wrappers (Vue first, then React and
Svelte). StackMap becomes the first consumer, replacing its flat-feeling
Cytoscape.js + fcose graph view.

## Core Value

The **feel**: an interactive graph that moves like NVL/Bloom (springy physics,
live hover halos, eased focus camera) yet is open source and drops into any
framework. If everything else fails, that tactile quality must be there — it is
the entire reason to build rather than keep Cytoscape.

## Business Context

- **Customer**: internal (StackMap is first consumer) + the open-source community.
- **Revenue model**: none directly — OSS credibility / brand for ShipWithAI, and
  a reusable asset across our own products.
- **Success metric**: StackMap migrated with zero feature loss + measurably
  better feel; npm package adopted outside the org.
- **Strategy notes**: extracted from `Ship-With-AI/stackmap` GraphView; see
  issue Ship-With-AI/ship-agent#14.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Framework-agnostic TS core with a pluggable renderer/physics engine.
- [ ] Feel bar: physics elasticity, hover 1-hop halo, eased focus camera,
      expand/collapse, spring-back drag, reduced-motion path.
- [ ] Vue 3 wrapper (StackMap is Nuxt/Vue) — first-class.
- [ ] React + Svelte wrappers.
- [ ] Feature parity with StackMap's current graph: edge-type filters,
      community/family focus, `?focus=<slug>` deep link, keyboard + screen-reader
      a11y list fallback.
- [ ] Handles StackMap's `graph.json` scale (≈645 nodes / 755 links) plus 5×
      headroom smoothly.
- [ ] Docs + demo site covering install and all three framework bindings.
- [ ] Published npm package(s), MIT.
- [ ] StackMap migrated via PR; old `GraphView.client.vue` removed.

### Out of Scope

- Forking or vendoring Neo4j NVL — source-available, not OSS; license-incompatible.
- 3D rendering — the feel bar is 2D; 3D adds cost with no StackMap need.
- Graph *editing* (add/delete nodes by the user) — visualization only for v1.
- Server-side layout / graph database integration — client component only.
- Massive-scale (>10k node) rendering in v1 — real data is ≈645 nodes; a WebGL
  backend is a documented future extension, not v1 scope.

## Context

- **Neo4j NVL is the quality bar but NOT usable**: npm license
  `SEE LICENSE IN 'LICENSE.txt'`, Neo4j source-available, tied to Neo4j usage.
  We cannot fork it. Only MIT-compatible dependencies allowed in the shippable core.
- **Current StackMap graph** (`app/components/GraphView.client.vue`,
  Cytoscape.js + fcose) is informative but flat: no elasticity, weak focus
  transitions, no hover halos, no expand/collapse.
- **Real dataset** (`Ship-With-AI/stackmap:graphify-out/graph.json`, commit
  91e248e): 645 nodes, 755 links, 67 hyperedges, 104 communities. Sparse —
  degree max 11, mean 2.34, median 2. Node fields `{id,label,file_type,
  community,community_name}`; link fields `{source,target,relation,weight}`.
  Relations: `semantically_similar_to` 386, `conceptually_related_to` 166,
  `references` 156, `cites` 22, `implements` 19, `shares_data_with` 6.
  (Dispatch described `{a,b,rel}`; the real schema is `{source,target,relation}` —
  the spike + core adapt to the real shape.)
- **Research decision resolved** (see RESEARCH.md): thin wrapper over the MIT
  `force-graph` (Canvas 2D + d3-force) engine, behind a shipgraph-owned API and a
  renderer seam — backed by a runnable spike measured at 60fps @1× and ~57fps
  settled interaction @5× on the real graph.

## Constraints

- **License**: shippable core deps MUST be MIT-compatible — NVL is off-limits.
- **Tech stack**: TypeScript core, Canvas 2D via `force-graph` + `d3-force`
  (MIT) for v1; Vue 3 / React / Svelte wrappers.
- **Compatibility**: Vue-first (StackMap is Nuxt/Vue), React + Svelte follow.
- **Performance**: smooth at StackMap scale (≈645/755) with 5× headroom.
- **Accessibility**: keyboard navigation + screen-reader list fallback +
  `prefers-reduced-motion` support are non-negotiable feature-parity items.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| MIT license | Max adoption; NVL incompatible anyway | ✓ Good |
| Vue-first, then React/Svelte | StackMap is the first consumer (Nuxt/Vue) | ✓ Good |
| Wrap `force-graph` (Canvas 2D + d3-force), not own renderer | Hits the feel bar OOTB; MIT; 60fps at 1× and settled 5× on real data (spike-measured); own renderer = weeks with no payoff at this scale | ✓ Good |
| shipgraph-owned API + renderer seam over the engine | Consumers never see force-graph; lets a WebGL backend slot in past ~10k nodes | — Pending |
| Do NOT use/fork Neo4j NVL | Source-available, license-incompatible | ✓ Good |

---
*Last updated: 2026-08-24 after research/scaffold slice (issue #14).*
