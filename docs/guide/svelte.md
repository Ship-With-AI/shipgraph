# Quick start · @shipgraph/svelte

An idiomatic, SSR-safe Svelte 5 `<ShipGraph>` component over the core.

## Install

```sh
pnpm add @shipgraph/svelte @shipgraph/core svelte
```

## Use

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { ShipGraph } from '@shipgraph/svelte';
  import type { RawGraph } from '@shipgraph/svelte';

  let data: RawGraph | null = $state(null);
  let filters: string[] | null = $state(null);
  let focus: string | null = $state(null);

  onMount(async () => {
    data = await fetch('/graph.json').then((r) => r.json());
  });
</script>

<div style="width: 100%; height: 600px">
  {#if data}
    <ShipGraph
      {data}
      {filters}
      {focus}
      onNode={(id) => (focus = id)}
      onHover={(id) => console.log('hover', id)}
      onFocus={(id) => console.log('focused', id)}
      onReady={(g) => g.fit()}
    />
  {/if}
</div>
```

Events are idiomatic Svelte 5 callback props (`onNode`, `onLink`, `onHover`,
`onFocus`, `onReady`) — no `createEventDispatcher`.

## SSR (SvelteKit)

The component renders only the container + accessible node list on the server;
the graph mounts on the client. Nothing touches `window`/`document` at module
scope, so it cannot crash SSR — no `<svelte:head>` guard or `browser` check is
required at the call site.

Full surface: [Svelte API reference](/api/svelte).
