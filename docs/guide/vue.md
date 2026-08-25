# Quick start · @shipgraph/vue

A reactive, SSR/Nuxt-safe `<ShipGraph>` Vue 3 component over the core.

## Install

```sh
pnpm add @shipgraph/vue @shipgraph/core vue
```

## Use

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ShipGraph } from '@shipgraph/vue';
import type { RawGraph } from '@shipgraph/vue';

const data = ref<RawGraph | null>(null);
const filters = ref<string[] | null>(null);
const focus = ref<string | null>(null);
const focusCommunity = ref<number | null>(null);

onMounted(async () => {
  data.value = await fetch('/graph.json').then((r) => r.json());
});
</script>

<template>
  <div style="width: 100%; height: 600px">
    <ShipGraph
      v-if="data"
      :data="data"
      :filters="filters"
      :focus="focus"
      :focus-community="focusCommunity"
      @node="(id) => (focus = id)"
      @hover="(id) => console.log('hover', id)"
      @focus="(id) => console.log('focused', id)"
      @ready="(g) => g.fit()"
    />
  </div>
</template>
```

The wrapping element must have a size — the component fills its parent.

## Reactive props

Mutate a prop and the component drives the matching core primitive: `filters`
and `hiddenRelations` for edge filters, `focus` for the eased camera,
`focusCommunity` for family focus, `draggable` / `reducedMotion` for motion.

## Nuxt

The component never touches `window`/`document` during server render, so it is
SSR-safe. Wrap in `<ClientOnly>` to skip the server render entirely:

```vue
<ClientOnly>
  <ShipGraph :data="data" />
</ClientOnly>
```

## Imperative methods (template ref)

```ts
import { ref } from 'vue';
const el = ref<InstanceType<typeof ShipGraph>>();

el.value?.focusNode('repos_langgraph');
el.value?.toggleRelation('references');
el.value?.focusCommunity(3);
el.value?.graph;  // the live core instance — fit(), reheat(), etc.
```

Full surface: [Vue API reference](/api/vue).
