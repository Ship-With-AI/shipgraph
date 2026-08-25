<script setup lang="ts">
// @shipgraph/vue — a reactive, SSR/Nuxt-safe Vue 3 component over
// @shipgraph/core. It owns lifecycle (mount/destroy), maps prop changes to the
// core's imperative feel primitives, relays core events as Vue emits, and adds
// the parity layer: edge-type filters, community focus, `?focus=` deep links,
// and a keyboard/screen-reader accessible fallback.
//
// SSR safety: nothing at module scope touches window/document/canvas. The core
// (which pulls in the Canvas 2D engine) is loaded via a dynamic import inside
// onMounted, so it never runs on the server. Under Nuxt, wrap in <ClientOnly>
// for zero server render; either way this component cannot crash during SSR.
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import type {
  GraphData,
  GraphLink,
  GraphNode,
  RawGraph,
  RawNode,
  ShipGraph as ShipGraphInstance,
  ShipGraphOptions,
} from '@shipgraph/core';

const props = withDefaults(
  defineProps<{
    /** Raw `graph.json` or canonical GraphData. Reactive. */
    data: RawGraph | GraphData;
    /** Active relation classes (inclusion); null/empty restores all. Reactive. */
    filters?: string[] | null;
    /** Relation classes to hide live (exclusion toggle). Reactive. */
    hiddenRelations?: string[] | null;
    /** Node id to ease the camera to. Reactive. */
    focus?: string | null;
    /** Persistently selected node id (null clears). Reactive. */
    selected?: string | null;
    /** Community/family to isolate + highlight (dims the rest). Reactive. */
    focusCommunity?: number | null;
    /** Honor prefers-reduced-motion path. Reactive. */
    reducedMotion?: boolean;
    /** Allow dragging nodes with spring-back on release. Reactive. */
    draggable?: boolean;
    /** Read the deep-link query param on mount (client-only). Default true. */
    deepLink?: boolean;
    /** Query param name read for the deep link. Default "focus". */
    deepLinkParam?: string;
    /** Accessible label for the graph region. */
    ariaLabel?: string;
    /** One-time construction options (engine-agnostic). */
    options?: ShipGraphOptions;
  }>(),
  {
    filters: null,
    hiddenRelations: null,
    focus: null,
    selected: null,
    focusCommunity: null,
    reducedMotion: undefined,
    draggable: undefined,
    deepLink: true,
    deepLinkParam: 'focus',
    ariaLabel: 'Interactive graph visualization',
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
  /** The persistent selection changed (null clears). */
  (e: 'select', id: string | null): void;
  /** The core instance is mounted and ready. */
  (e: 'ready', graph: ShipGraphInstance): void;
}>();

const container = shallowRef<HTMLDivElement | null>(null);
// The instance is an external, non-reactive object → shallowRef avoids deep
// reactive proxying of engine internals.
const graph = shallowRef<ShipGraphInstance | null>(null);
const unsubscribers: Array<() => void> = [];

// --- accessible fallback: a keyboard/SR-navigable list of every node ---------
// Derived straight from the data prop (engine-agnostic), so it works even
// before/without a rendered canvas — e.g. under SSR hydration or a SR-only user.
const nodeList = computed<Array<{ id: string; label: string }>>(() =>
  ((props.data?.nodes ?? []) as Array<GraphNode | RawNode>).map((n) => ({
    id: n.id,
    label: n.label ?? n.id,
  })),
);
const activeIndex = ref(-1);
const activeAnnouncement = computed(() =>
  activeIndex.value >= 0 && activeIndex.value < nodeList.value.length
    ? `Focused ${nodeList.value[activeIndex.value].label}`
    : '',
);

function focusIndex(i: number): void {
  const list = nodeList.value;
  if (i < 0 || i >= list.length) return;
  activeIndex.value = i;
  graph.value?.focus(list[i].id);
}

function onKeydown(e: KeyboardEvent): void {
  const n = nodeList.value.length;
  if (!n) return;
  switch (e.key) {
    case 'ArrowDown':
    case 'ArrowRight':
      e.preventDefault();
      focusIndex((activeIndex.value + 1 + n) % n);
      break;
    case 'ArrowUp':
    case 'ArrowLeft':
      e.preventDefault();
      focusIndex((activeIndex.value - 1 + n) % n);
      break;
    case 'Home':
      e.preventDefault();
      focusIndex(0);
      break;
    case 'End':
      e.preventDefault();
      focusIndex(n - 1);
      break;
    case 'Enter':
    case ' ':
      if (activeIndex.value >= 0) {
        e.preventDefault();
        focusIndex(activeIndex.value);
      }
      break;
    default:
      break;
  }
}

// Read `?<deepLinkParam>=<slug>` from the URL. Client-only; returns null under
// SSR (no window) so it can never crash on the server.
function readDeepLinkFocus(): string | null {
  if (typeof window === 'undefined' || !window.location) return null;
  try {
    const value = new URLSearchParams(window.location.search).get(props.deepLinkParam);
    return value && value.length ? value : null;
  } catch {
    return null;
  }
}

// Reconcile the declarative `hiddenRelations` prop with the core's toggle state.
function applyHiddenRelations(list: string[] | null | undefined): void {
  const g = graph.value;
  if (!g || list === undefined) return;
  const want = new Set(list ?? []);
  const have = new Set(g.getHiddenRelations());
  for (const r of want) if (!have.has(r)) g.toggleRelation(r, false);
  for (const r of have) if (!want.has(r)) g.toggleRelation(r, true);
}

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
  applyHiddenRelations(props.hiddenRelations);
  if (props.focusCommunity != null) g.focusCommunity(props.focusCommunity);

  // Deep link takes effect only when no explicit focus prop was supplied.
  const initialFocus = props.focus ?? (props.deepLink ? readDeepLinkFocus() : null);
  if (initialFocus) g.focus(initialFocus);
  if (props.selected != null) g.select(props.selected);

  unsubscribers.push(
    g.on('click', (id) => emit('node', id)),
    g.on('linkclick', (link) => emit('link', link)),
    g.on('hover', (id) => emit('hover', id)),
    g.on('focus', (id) => emit('focus', id)),
    g.on('select', (id) => emit('select', id)),
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
  () => props.hiddenRelations,
  (list) => applyHiddenRelations(list),
  { deep: true },
);
watch(
  () => props.focus,
  (id) => {
    if (id) graph.value?.focus(id);
  },
);
watch(
  () => props.selected,
  (id) => graph.value?.select(id ?? null),
);
watch(
  () => props.focusCommunity,
  (community) => graph.value?.focusCommunity(community ?? null),
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

// Imperative surface for advanced use. `graph` is the live core instance; the
// method wrappers make the parity features callable via a template ref.
defineExpose({
  graph,
  focusNode: (id: string) => graph.value?.focus(id),
  toggleRelation: (relation: string, visible?: boolean) =>
    graph.value?.toggleRelation(relation, visible),
  focusCommunity: (community: number | null) => graph.value?.focusCommunity(community),
});
</script>

<template>
  <div class="shipgraph-root">
    <div
      ref="container"
      class="shipgraph"
      tabindex="0"
      role="application"
      :aria-label="ariaLabel"
      aria-describedby="shipgraph-sr-help"
      aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight Home End Enter"
      @keydown="onKeydown"
    />
    <!-- Screen-reader + keyboard fallback. Visually hidden but fully navigable:
         one accessible entry per node, each focuses its node on activation. -->
    <p id="shipgraph-sr-help" class="sg-sr-only">
      Interactive graph. Use arrow keys to move between {{ nodeList.length }} nodes
      and Enter to focus one.
    </p>
    <ul class="sg-sr-only shipgraph-node-list" aria-label="Graph nodes">
      <li v-for="(n, i) in nodeList" :key="n.id">
        <button
          type="button"
          :aria-current="i === activeIndex ? 'true' : undefined"
          @click="focusIndex(i)"
        >
          {{ n.label }}
        </button>
      </li>
    </ul>
    <p class="sg-sr-only" aria-live="polite">{{ activeAnnouncement }}</p>
  </div>
</template>

<style scoped>
.shipgraph-root {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 240px;
}
.shipgraph {
  width: 100%;
  height: 100%;
  min-height: 240px;
}
/* Visually hidden but available to assistive tech and keyboard focus. */
.sg-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
