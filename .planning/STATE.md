# STATE: shipgraph

## Project Reference

See: .planning/PROJECT.md (updated 2026-08-24)

**Core value:** NVL/Bloom-grade *feel* (springy physics, hover halos, eased focus
camera) in an MIT, framework-agnostic component.
**Current focus:** Phase 2 (Core Architecture) complete → Phase 3 (Vue Wrapper & Feel Polish) next.

## Milestone

v1.0 — MVP: framework-agnostic core + Vue/React/Svelte wrappers, feature parity
with StackMap's graph, published to npm, StackMap migrated.

## Status

| Item | State |
|------|-------|
| Repo | Ship-With-AI/shipgraph (public, MIT) |
| GSD setup | PROJECT.md, ROADMAP.md, REQUIREMENTS.md, config.json, STATE.md written |
| Research | RESEARCH.md complete — decision: **wrap `force-graph` (MIT)** |
| Spike | `spikes/` — runnable feel-bar on real graph.json + headless perf harness |
| Phase 1 | Complete (2026-08-24) |
| Phase 2 | Complete (2026-08-24) — `@shipgraph/core` (engine seam + adapter + feel primitives) |
| Phase 3+ | Not started |

## Key Decision (locked by spike evidence)

**Wrap the MIT `force-graph` (Canvas 2D + d3-force) engine behind a
shipgraph-owned API and a renderer seam.** Not an own renderer (no payoff at this
scale), not sigma.js (WebGL perf unneeded <10k nodes), not staying on
Cytoscape+fcose (flat feel). Measured: 60fps @1×, ~57fps settled interaction @5× on real data.

## Next Action

`/gsd-plan-phase 3` — Vue 3 wrapper (`@shipgraph/vue`) over the core + NVL feel polish.
