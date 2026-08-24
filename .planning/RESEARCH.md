# RESEARCH: shipgraph — Phase 1 (Research & Spike)

**Question:** Build a graph renderer/physics engine from scratch, or wrap an
existing MIT engine, to hit the Neo4j-NVL/Bloom *feel* bar in a framework-
agnostic, MIT-licensed component?

**Recommendation:** **Wrap `force-graph` (Canvas 2D + d3-force, MIT)** behind a
shipgraph-owned public API and a renderer/physics seam. Decision is backed by a
runnable spike measured on StackMap's real `graph.json`, not opinion.

---

## Evidence: the spike

`spikes/` is a runnable Vite app that renders StackMap's real graph
(`spikes/public/graph.json`, commit `91e248e`: 645 nodes / 755 links / 67
hyperedges / 104 communities) with the full feel bar over `force-graph`:

- **Physics elasticity** — d3-force charge `-140` (distanceMax 420) + link
  spring (distance scaled by `1 - weight`, strength 0.5): the NVL "bounce".
- **Hover 1-hop halo** — precomputed adjacency; hovered node + neighbors +
  incident links highlighted, everything else dimmed.
- **Eased click-to-focus camera** — 700ms `centerAt` + `zoom` ease
  (0ms under `prefers-reduced-motion`).
- **Spring-back drag** — pin (`fx/fy`) during drag, release + reheat on end so
  physics reels the node back.
- **Reduced-motion path** — toggle drops camera easing to 0ms.

Data adapts the real `{source,target,relation,weight}` link schema and
`{id,label,file_type,community,community_name}` node schema (the dispatch's
`{a,b,rel}` was wrong; the spike + core follow the real shape). A `scaleUp()`
clones the real topology into N shifted copies with bridge links to synthesize
a ~5× graph with a realistic degree distribution.

## Evidence: perf (headless harness, `spikes/perf.mjs` → `perf-results.json`)

Chrome 131, puppeteer-driven, real graph:

| Scale | Nodes | Links | Active FPS | Active p95 frame | Settled+interact FPS | Settled p95 |
|-------|-------|-------|-----------|------------------|----------------------|-------------|
| 1×    | 645   | 755   | **60.1**  | 18.9ms           | 60.2                 | 17.1ms      |
| 5×    | 3225  | 3855  | 43.3      | 33.0ms           | **57.2**             | 18.1ms      |

Read: at StackMap's real scale it is a solid 60fps during live simulation and
interaction. At 5× headroom (3225 nodes) the hot simulation phase runs ~35–43fps
for the ~10s settle, then recovers to ~57fps steady interaction once the layout
settles. Screenshots: `overview-1x.png`, `perf-1x.png`, `perf-5x.png`. Numbers
reproduce via `node perf.mjs` (Chrome 131, headless).

## Options considered

| Option | Feel bar | License | Perf @ real scale | Cost | Verdict |
|--------|----------|---------|-------------------|------|---------|
| **Wrap `force-graph`** | OOTB (Canvas 2D + d3-force) | MIT | 60fps @1×, ~57fps settled @5× (measured) | Low — thin adapter | **Chosen** |
| Own renderer + physics | Full control | n/a | Would need to re-derive d3-force | Weeks, zero payoff <10k nodes | Rejected |
| `sigma.js` (WebGL) | Good, but WebGL-first | MIT | Overkill; feel primitives less direct | Med | Rejected — WebGL perf unneeded <10k nodes |
| `cytoscape.js` + fcose | Flat (StackMap's status quo) | MIT | Fine | — | Rejected — the whole reason to build |
| Fork Neo4j NVL | The bar itself | **source-available, NOT OSS** | — | — | Rejected — license-incompatible |

## Why a seam, not a bare dependency

Consumers get a shipgraph-owned API (`createGraph`, `focus`, filters, halo,
expand/collapse); `force-graph` never leaks. That keeps two doors open:
1. A WebGL backend can slot behind the same API past ~10k nodes (documented
   future extension — real data is ≈645 nodes, so out of v1 scope).
2. We are not hostage to `force-graph`'s API surface or maintenance.

## Risks / open questions (carried into Phase 2)

- **force-graph label/glyph customization** for exact NVL glyphs — spike uses
  `nodeCanvasObject` replace mode; confirm it covers all feel-bar visuals.
- **SSR/Nuxt mount** — StackMap is Nuxt; the Vue wrapper (Phase 3) must mount
  client-only. Not a Phase-1 blocker.
- **5× settle dip** — acceptable (interaction stays 60fps), but Phase 2 should
  expose a "pre-settle / freeze layout" option for very large graphs.
- **graph.json as fixture** — it encodes StackMap's module structure; kept as a
  spike fixture since the dispatch called for real data. Revisit before making
  it a published demo dataset.

## Decision

Proceed to **Phase 2: Core Architecture** — build `@shipgraph/core` as a
framework-agnostic TS package wrapping `force-graph` behind the engine seam and
data adapter. Build-vs-wrap is settled: **wrap**, on evidence.

---
*Phase 1 complete — 2026-08-24. Spike: `spikes/`. Perf: `spikes/perf-results.json`.*
