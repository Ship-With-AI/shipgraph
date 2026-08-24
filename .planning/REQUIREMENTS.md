# Requirements: shipgraph

Scope derived from Ship-With-AI/ship-agent#14 acceptance criteria. IDs flow into
ROADMAP.md phases and downstream plan `must_haves`.

## Functional

- **REQ-01 — Build-vs-wrap decision (research)**: A runnable spike on the real
  `graph.json` demonstrating the feel bar, with perf at 1× and ~5×, backing a
  clear build-vs-wrap recommendation. *(Phase 1 — DONE)*
- **REQ-02 — Framework-agnostic core**: `@shipgraph/core` in TypeScript with zero
  framework dependencies; mounts into any DOM container. *(Phase 2)*
- **REQ-03 — Engine seam + data adapter**: Rendering/physics engine behind a
  shipgraph-owned API so the engine can be swapped; adapter ingests StackMap's
  `{source,target,relation}` node/link schema. *(Phase 2)*
- **REQ-04 — Vue 3 wrapper**: `@shipgraph/vue` component, reactive, Nuxt/SSR-safe. *(Phase 3)*
- **REQ-05 — Feel bar**: physics elasticity, hover 1-hop neighborhood halo, eased
  click-to-focus camera, expand/collapse, spring-back drag,
  `prefers-reduced-motion` path. *(Phase 3)*
- **REQ-06 — Edge-type filters**: toggle relation classes
  (`semantically_similar_to`, `references`, …) live. *(Phase 4)*
- **REQ-07 — Community/family focus**: isolate + highlight a community. *(Phase 4)*
- **REQ-08 — `?focus=<slug>` deep link**: on load, center + focus the node. *(Phase 4)*
- **REQ-09 — Accessibility**: keyboard navigation + screen-reader list fallback. *(Phase 4)*
- **REQ-10 — React & Svelte wrappers**: `@shipgraph/react`, `@shipgraph/svelte`,
  same core + feature set. *(Phase 5)*
- **REQ-11 — Docs & demo**: install + all three bindings, runnable examples,
  live demo on real data, API reference. *(Phase 6)*
- **REQ-12 — npm publish**: MIT package(s) with CI + versioning. *(Phase 7)*
- **REQ-13 — StackMap migration**: StackMap uses `@shipgraph/vue`; no regression;
  `GraphView.client.vue` + Cytoscape/fcose removed. *(Phase 8)*

## Non-Functional

- **NFR-perf**: smooth (target 60fps interactive) at StackMap scale (≈645/755)
  with 5× headroom (≈3225/3855). *(Spike-verified for the chosen engine.)*
- **NFR-license**: every shippable-core dependency MUST be MIT-compatible;
  Neo4j NVL is explicitly excluded.
- **NFR-a11y**: `prefers-reduced-motion` honored; keyboard + SR paths are
  first-class, not afterthoughts.
- **NFR-bundle**: thin wrappers; core kept lean (Canvas 2D, no heavyweight
  layout/graph frameworks bundled).

## Out of Scope (v1)

- Neo4j NVL fork/vendor (license-incompatible).
- 3D rendering; graph editing; server-side layout; >10k-node scale (WebGL backend
  is a documented future extension behind the engine seam).
