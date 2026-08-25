# STATE: shipgraph

## Project Reference

See: .planning/PROJECT.md (updated 2026-08-24)

**Core value:** NVL/Bloom-grade *feel* (springy physics, hover halos, eased focus
camera) in an MIT, framework-agnostic component.
**Current focus:** Phase 8 (StackMap Migration) complete — StackMap renders via `@shipgraph/vue`. Milestone deliverables done except the operator-gated npm publish.

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
| Phase 7 | Pipeline ready (2026-08-25) — pnpm workspaces + Turborepo; 4 MIT packages release-ready; CI + release workflows; `pnpm -r publish --dry-run` green (88 tests: core 27 / vue 21 / react 20 / svelte 20). **Actual publish + `v*` tag pending operator go.** |
| Phase 8 | Complete (2026-08-25) — StackMap renders its graph via `@shipgraph/vue`; old Cytoscape/fcose `GraphView` + deps removed. PR: Ship-With-AI/stackmap#5. Consumes shipgraph via vendored git-build tarballs (`file:` deps) pending npm publish. |

## Key Decision (locked by spike evidence)

**Wrap the MIT `force-graph` (Canvas 2D + d3-force) engine behind a
shipgraph-owned API and a renderer seam.** Not an own renderer (no payoff at this
scale), not sigma.js (WebGL perf unneeded <10k nodes), not staying on
Cytoscape+fcose (flat feel). Measured: 60fps @1×, ~57fps settled interaction @5× on real data.

## Next Action

Operator go/no-go on first publish. When approved: push tag `v0.x`/`v1.0.0`
(triggers `.github/workflows/release.yml` → `pnpm -r publish` with provenance).
Then swap StackMap's `file:` deps (Ship-With-AI/stackmap#5, `vendor/shipgraph/*.tgz`)
to the published `@shipgraph/vue@^0.4` / `@shipgraph/core@^0.3` npm ranges and delete
the vendored tarballs. All 8 roadmap phases are otherwise complete.
