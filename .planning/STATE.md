# STATE: shipgraph

## Project Reference

See: .planning/PROJECT.md (updated 2026-08-24)

**Core value:** NVL/Bloom-grade *feel* (springy physics, hover halos, eased focus
camera) in an MIT, framework-agnostic component.
**Current focus:** Phase 7 (npm Publish) — release pipeline PREP+DRY-RUN complete;
real `npm publish` gated on operator approval.

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
| Phase 1 | Complete (2026-08-24) — research + scaffold + spike |
| Phase 2 | Complete (2026-08-24) — `@shipgraph/core` (engine seam + adapter + feel primitives) |
| Phase 3 | Complete (2026-08-24) — `@shipgraph/vue` (reactive SSR-safe wrapper + feel polish) |
| Phase 4 | Complete (2026-08-25) — edge filters, community focus, `?focus=` deep link, a11y |
| Phase 5 | Complete (2026-08-25) — `@shipgraph/react` + `@shipgraph/svelte` thin bindings |
| Phase 6 | Complete (2026-08-25) — `docs/` VitePress site: install/quickstart/API ×4 + live Vue feel-bar demo on real graph.json |
| Phase 7 | Pipeline ready (2026-08-25) — package.json publish-ready ×4, LICENSE+README ×4, ci.yml+release.yml, all 4 `npm publish --dry-run` verified. **Real publish pending operator go.** |
| Phase 8+ | Not started |

## Key Decision (locked by spike evidence)

**Wrap the MIT `force-graph` (Canvas 2D + d3-force) engine behind a
shipgraph-owned API and a renderer seam.** Not an own renderer (no payoff at this
scale), not sigma.js (WebGL perf unneeded <10k nodes), not staying on
Cytoscape+fcose (flat feel). Measured: 60fps @1×, ~57fps settled interaction @5× on real data.

## Next Action

Operator authorizes real publish → push tag `v0.1.0` (fires release.yml). Then Phase 8: StackMap migration.
