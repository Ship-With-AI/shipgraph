# Roadmap: shipgraph

## Overview

From evidence to shipped OSS component: prove the build-vs-wrap decision with a
runnable spike (done), build a framework-agnostic TS core that hits the NVL feel
bar over an MIT engine, layer a Vue wrapper and port StackMap's existing
features so nothing is lost, add React + Svelte wrappers, publish with docs and a
demo, then migrate StackMap onto it and delete the old Cytoscape view.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [x] **Phase 1: Research & Spike** - Build-vs-wrap decision, proven on real data
- [x] **Phase 2: Core Architecture** - Framework-agnostic TS core + feel primitives
- [x] **Phase 3: Vue Wrapper & Feel Polish** - Vue 3 binding + NVL-grade feel bar
- [x] **Phase 4: Feature-Parity Port** - Filters, community focus, deep link, a11y
- [x] **Phase 5: React & Svelte Wrappers** - Two more thin bindings, same core
- [x] **Phase 6: Docs & Demo Site** - Install + 3 bindings, runnable examples
- [ ] **Phase 7: npm Publish** - MIT package(s), CI, versioning
- [ ] **Phase 8: StackMap Migration** - Replace GraphView.client.vue, remove old code

## Phase Details

### Phase 1: Research & Spike
**Goal**: Decide build-vs-wrap from evidence, not opinion — a runnable prototype
of the feel bar on StackMap's real `graph.json`, with perf at current scale and 5×.
**Depends on**: Nothing (first phase)
**Requirements**: REQ-01
**Success Criteria** (what must be TRUE):
  1. A runnable spike renders the real graph with elasticity, hover 1-hop halo,
     and eased focus camera.
  2. Perf measured at 1× (≈645/755) and ~5× (≈3225/3855) with hard numbers.
  3. RESEARCH.md gives a clear build-vs-wrap recommendation backed by the spike.
**Plans**: 1 plan

Plans:
- [x] 01-01: force-graph feel-bar spike + headless perf harness + RESEARCH.md

### Phase 2: Core Architecture
**Goal**: A framework-agnostic TypeScript `@shipgraph/core` that owns the public
API and feel primitives, wrapping the `force-graph` (Canvas 2D + d3-force) engine
behind a renderer/physics seam so a WebGL backend can slot in later.
**Depends on**: Phase 1
**Requirements**: REQ-02, REQ-03
**Success Criteria** (what must be TRUE):
  1. `createGraph(container, { nodes, links })` mounts and renders any dataset.
  2. Public API exposes feel primitives (hover halo, focus(node), fit, filters,
     expand/collapse) without leaking force-graph internals.
  3. A data adapter maps StackMap's `{source,target,relation}` schema in.
  4. Core builds to ESM + types with zero framework deps.
**Plans**: 2 plans

Plans:
- [x] 02-01: Engine seam + data model + adapter + build tooling
- [x] 02-02: Feel primitives API (physics, halo, focus camera, drag, reduced-motion)

### Phase 3: Vue Wrapper & Feel Polish
**Goal**: `@shipgraph/vue` — a Vue 3 component over the core — plus the polish
pass that makes the feel bar match NVL/Bloom.
**Depends on**: Phase 2
**Requirements**: REQ-04, REQ-05
**Success Criteria** (what must be TRUE):
  1. `<ShipGraph :data />` renders and is reactive to prop changes.
  2. Feel bar complete: elasticity, hover halo, eased focus/zoom, expand/collapse,
     spring-back drag, `prefers-reduced-motion` path.
  3. Runs at 60fps on StackMap's real data in a real browser.
**Plans**: 2 plans

Plans:
- [x] 03-01: Vue 3 binding (lifecycle, reactivity, events, SSR/Nuxt-safe mount)
- [x] 03-02: Feel polish + reduced-motion + expand/collapse

### Phase 4: Feature-Parity Port
**Goal**: Everything StackMap's current graph does, so migration loses nothing.
**Depends on**: Phase 3
**Requirements**: REQ-06, REQ-07, REQ-08, REQ-09
**Success Criteria** (what must be TRUE):
  1. Edge-type filters toggle relation classes live.
  2. Community/family focus isolates and highlights a community.
  3. `?focus=<slug>` deep link centers + focuses that node on load.
  4. Keyboard navigation + screen-reader list fallback work without a mouse.
**Plans**: 2 plans

Plans:
- [x] 04-01: Edge-type filters + community focus
- [x] 04-02: `?focus=` deep link + keyboard/SR a11y list fallback

### Phase 5: React & Svelte Wrappers
**Goal**: `@shipgraph/react` and `@shipgraph/svelte` — same core, thin bindings.
**Depends on**: Phase 2 (core); parity with Phase 3/4 features
**Requirements**: REQ-10
**Success Criteria** (what must be TRUE):
  1. React component renders + is prop-reactive with idiomatic hooks.
  2. Svelte component renders + is prop-reactive idiomatically.
  3. Both expose the same feel bar and parity features as Vue.
**Plans**: 2 plans

Plans:
- [x] 05-01: React wrapper
- [x] 05-02: Svelte wrapper

### Phase 6: Docs & Demo Site
**Goal**: A docs/demo site covering install and all three bindings with runnable
examples on the real dataset.
**Depends on**: Phase 5
**Requirements**: REQ-11
**Success Criteria** (what must be TRUE):
  1. Install + quickstart for core, Vue, React, Svelte.
  2. Live demo of the feel bar on real data.
  3. API reference for the public surface.
**Plans**: 1 plan

Plans:
- [x] 06-01: Docs site + live demo

### Phase 7: npm Publish
**Goal**: Publish MIT package(s) with CI and versioning.
**Depends on**: Phase 6
**Requirements**: REQ-12
**Success Criteria** (what must be TRUE):
  1. `npm i @shipgraph/core` (+ vue/react/svelte) installs and works.
  2. CI builds + type-checks + publishes on tag.
  3. LICENSE (MIT) and README present.
**Plans**: 1 plan

Plans:
- [ ] 07-01: Monorepo release pipeline + first publish

### Phase 8: StackMap Migration
**Goal**: StackMap consumes shipgraph; old graph view removed.
**Depends on**: Phase 7
**Requirements**: REQ-13
**Success Criteria** (what must be TRUE):
  1. StackMap renders its graph via `@shipgraph/vue`.
  2. No feature regression (filters, focus, deep link, a11y all work).
  3. `GraphView.client.vue` + Cytoscape/fcose deps removed.
**Plans**: 1 plan

Plans:
- [ ] 08-01: StackMap migration PR

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Research & Spike | 1/1 | Complete | 2026-08-24 |
| 2. Core Architecture | 2/2 | Complete | 2026-08-24 |
| 3. Vue Wrapper & Feel Polish | 2/2 | Complete | 2026-08-24 |
| 4. Feature-Parity Port | 2/2 | Complete | 2026-08-25 |
| 5. React & Svelte Wrappers | 2/2 | Complete | 2026-08-25 |
| 6. Docs & Demo Site | 1/1 | Complete | 2026-08-25 |
| 7. npm Publish | 0/1 | Not started | - |
| 8. StackMap Migration | 0/1 | Not started | - |
