# Quick start · @shipgraph/react

An idiomatic, SSR-safe `<ShipGraph>` component (and a `useShipGraph` hook) over
the core.

## Install

```sh
pnpm add @shipgraph/react @shipgraph/core react react-dom
```

## Use

```tsx
import { useEffect, useState } from 'react';
import { ShipGraph } from '@shipgraph/react';
import type { RawGraph } from '@shipgraph/react';

export function Graph() {
  const [data, setData] = useState<RawGraph | null>(null);
  const [filters, setFilters] = useState<string[] | null>(null);
  const [focus, setFocus] = useState<string | null>(null);

  useEffect(() => {
    fetch('/graph.json').then((r) => r.json()).then(setData);
  }, []);

  if (!data) return null;
  return (
    <div style={{ width: '100%', height: 600 }}>
      <ShipGraph
        data={data}
        filters={filters}
        focus={focus}
        onNode={(id) => setFocus(id)}
        onHover={(id) => console.log('hover', id)}
        onFocus={(id) => console.log('focused', id)}
        onReady={(g) => g.fit()}
      />
    </div>
  );
}
```

Callbacks may be inline arrows — they are read through a latest-ref, so a new
identity every render never resubscribes the core.

## The hook

`useShipGraph` owns the whole lifecycle; `<ShipGraph>` is a thin view over it.
Reach for the hook to render your own container:

```tsx
import { useRef } from 'react';
import { useShipGraph } from '@shipgraph/react';

function Custom({ data }: { data: RawGraph }) {
  const ref = useRef<HTMLDivElement>(null);
  const { graph, focusNode, toggleRelation, focusCommunity } = useShipGraph(ref, { data });
  return <div ref={ref} style={{ width: '100%', height: 480 }} />;
}
```

## SSR (Next.js / Remix)

The component renders only the container + accessible node list on the server;
the graph mounts on the client. Nothing touches `window`/`document` at module
scope, so it cannot crash SSR. In the Next.js app router mark the consumer
`'use client'` (or use `next/dynamic` with `ssr: false`) since it is interactive.

Full surface: [React API reference](/api/react).
