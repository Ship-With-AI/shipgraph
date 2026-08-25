<script setup lang="ts">
// @shipgraph/vue — a reactive, SSR/Nuxt-safe Vue 3 component over
// @shipgraph/core. It owns lifecycle (mount/destroy), maps prop changes to the
// core's imperative feel primitives, and relays core events as Vue emits.
//
// SSR safety: nothing at module scope touches window/document/canvas. The core
// (which pulls in the Canvas 2D engine) is loaded via a dynamic import inside
// onMounted, so it never runs on the server. Under Nuxt, wrap in <ClientOnly>
// for zero server render; either way this component cannot crash during SSR.
import { onBeforeUnmount, onMounted, shallowRef, watch } from 'vue';
import type {
  GraphData,
  GraphLink,
  RawGraph,
  ShipGraph as ShipGraphInstance,
  ShipGraphOptions,
} from '@shipgraph/core';

const props = withDefaults(
  defineProps<{
    /** Raw `graph.json` or canonical GraphData. Reactive. */
    data: RawGraph | GraphData;
    /** Active relation classes; null/empty restores all. Reactive. */
    filters?: string[] | null;
    /** Node id to ease the camera to. Reactive. */
    focus?: string | null;
    /** Honor prefers-reduced-motion path. Reactive. */
    reducedMotion?: boolean;
    /** Allow dragging nodes with spring-back on release. Reactive. */
    draggable?: boolean;
    /** One-time construction options (engine-agnostic). */
    options?: ShipGraphOptions;
  }>(),
  {
    filters: null,
    focus: null,
    reducedMotion: undefined,
    draggable: undefined,
    options: undefined,
  },
);

const emit = defineEmits<{
  /** A node was clicked. */
  (e: 'node', id: string): void;
  /** A link was clicked (endpoints are node ids). */
  (e: 'link', link: GraphLink): void;
  /** Hovered node id, or null when the pointer leaves. */
  (e: 'hover', id: string | null): void;
  /** A node was focused (camera easing began). */
  (e: 'focus', id: string): void;
  /** The core instance is mounted and ready. */
  (e: 'ready', graph: ShipGraphInstance): void;
}>();

const container = shallowRef<HTMLDivElement | null>(null);
// The instance is an external, non-reactive object → shallowRef avoids deep
// reactive proxying of engine internals.
const graph = shallowRef<ShipGraphInstance | null>(null);
const unsubscribers: Array<() => void> = [];

onMounted(async () => {
  if (!container.value) return;
  // Client-only, runtime-deferred import: a static import would evaluate the
  // Canvas 2D engine (window/document access) at module load, which crashes
  // under SSR. Loading it here, inside onMounted, guarantees client-only eval.
  const { createGraph } = await import('@shipgraph/core');
  // The component may have unmounted while the dynamic import was in flight.
  if (!container.value) return;

  const g = createGraph(container.value, props.data, {
    ...(props.options ?? {}),
    ...(props.reducedMotion !== undefined ? { reducedMotion: props.reducedMotion } : {}),
    ...(props.draggable !== undefined ? { draggable: props.draggable } : {}),
  });
  graph.value = g;

  if (props.filters && props.filters.length) g.setFilters(props.filters);
  if (props.focus) g.focus(props.focus);

  unsubscribers.push(
    g.on('click', (id) => emit('node', id)),
    g.on('linkclick', (link) => emit('link', link)),
    g.on('hover', (id) => emit('hover', id)),
    g.on('focus', (id) => emit('focus', id)),
  );

  emit('ready', g);
});

// --- reactivity: prop changes drive the core's imperative primitives --------
watch(
  () => props.data,
  (data) => graph.value?.setData(data),
);
watch(
  () => props.filters,
  (filters) => graph.value?.setFilters(filters ?? null),
);
watch(
  () => props.focus,
  (id) => {
    if (id) graph.value?.focus(id);
  },
);
watch(
  () => props.reducedMotion,
  (on) => {
    if (on !== undefined) graph.value?.setReducedMotion(on);
  },
);
watch(
  () => props.draggable,
  (on) => {
    if (on !== undefined) graph.value?.setDraggable(on);
  },
);

onBeforeUnmount(() => {
  for (const off of unsubscribers) off();
  unsubscribers.length = 0;
  graph.value?.destroy();
  graph.value = null;
});

// Expose the live core instance for advanced imperative use (e.g. fit()).
defineExpose({ graph });
</script>

<template>
  <div ref="container" class="shipgraph" />
</template>

<style scoped>
.shipgraph {
  width: 100%;
  height: 100%;
  min-height: 240px;
}
</style>
