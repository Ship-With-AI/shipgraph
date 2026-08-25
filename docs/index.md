---
layout: home
hero:
  name: shipgraph
  text: NVL-grade feel, MIT, framework-agnostic
  tagline: Springy physics, hover halos, and an eased focus camera — over an MIT engine, with Core + Vue / React / Svelte bindings.
  actions:
    - theme: brand
      text: Get started
      link: /guide/introduction
    - theme: alt
      text: Live demo
      link: /demo
    - theme: alt
      text: View on GitHub
      link: https://github.com/Ship-With-AI/shipgraph
features:
  - title: Framework-agnostic core
    details: '@shipgraph/core owns the public API and the feel primitives, wrapping the MIT force-graph engine (Canvas 2D + d3-force) behind an engine seam. Zero framework deps, ESM + types.'
  - title: Thin bindings, one core
    details: '@shipgraph/vue, @shipgraph/react, and @shipgraph/svelte are thin, prop-reactive components over the same core. Same feel bar, same parity features, idiomatic in each framework.'
  - title: The feel bar
    details: Elastic physics, 1-hop hover halo, eased focus/zoom, spring-back drag, and a prefers-reduced-motion path — the difference between a graph that renders and one that feels alive.
  - title: Feature parity
    details: Live edge-type filters, community/family focus, ?focus= deep links, and full keyboard + screen-reader navigation. Nothing lost migrating off Cytoscape.
  - title: Proven on real data
    details: Measured at 60 fps on StackMap's real graph (645 nodes / 755 links) and ~60 fps at 5×. The live demo runs that exact dataset in your browser.
  - title: SSR-safe by construction
    details: Nothing touches window/document/canvas at module scope. The engine loads client-only, so the bindings cannot crash Nuxt / Next.js / SvelteKit server render.
---
