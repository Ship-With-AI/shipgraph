# Live demo

The public [`@shipgraph/vue`](/guide/vue) `<ShipGraph>` component, mounted on
StackMap's **real `graph.json`** — 645 nodes / 755 links, the same dataset the
research spike used. Everything below runs in your browser against that data.

Try it:

- **Hover halo** — hover any node to light up its 1-hop neighborhood and dim the rest.
- **Focus camera** — click a node (or pick one in the panel) for an eased center + zoom.
- **Edge filters** — toggle relation-class checkboxes to hide/show link types live.
- **Community focus** — pick a community to isolate + highlight a family, dimming the rest.
- **Drag** — drag a node; it springs back on release.

<ClientOnly>
  <LiveDemo />
</ClientOnly>

## Run it locally

The demo is served by the docs workspace against the package sources — no prior
package build required.

```sh
git clone https://github.com/Ship-With-AI/shipgraph
cd shipgraph
npm install
npm run docs:dev      # from the repo root
# ...or: npm run dev -w @shipgraph/docs
```

Open the printed URL and visit **/demo**. Build the static site with
`npm run docs:build` and preview it with `npm run docs:preview`.

## How it's wired

The demo is a single Vue component (`docs/components/LiveDemo.vue`) that fetches
`graph.json` and binds it to `<ShipGraph>`. Feel primitives are driven purely
through **reactive props + emits**:

| Interaction | Mechanism |
| --- | --- |
| Hover halo | automatic — the core drives the 1-hop halo on node hover |
| Focus camera | `@node` emit sets the reactive `:focus` prop |
| Edge filters | checkboxes drive the `:hidden-relations` prop |
| Community focus | a `<select>` drives the `:focus-community` prop |
| Drag / reduced motion | the `:draggable` / `:reduced-motion` props |

That's the same public API documented in the [Vue quick start](/guide/vue) — the
demo is a consumer of the shipped component, nothing more.
