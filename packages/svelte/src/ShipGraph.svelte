<script lang="ts">
  // @shipgraph/svelte — a reactive, SSR-safe Svelte 5 component over
  // @shipgraph/core. It owns lifecycle (mount/destroy), maps prop changes to the
  // core's imperative feel primitives via runes ($state/$derived/$effect),
  // relays core events as callback props, and adds the parity layer: edge-type
  // filters, community focus, `?focus=` deep links, and a keyboard/screen-reader
  // accessible fallback.
  //
  // SSR safety: nothing at module scope touches window/document/canvas. onMount
  // and $effect never run on the server, and the core (which pulls in the Canvas
  // 2D engine) is loaded via a dynamic import inside onMount, so it never runs
  // server-side. This component cannot crash during SSR.
  import { onMount } from 'svelte';
  import type {
    GraphData,
    GraphLink,
    GraphNode,
    RawGraph,
    RawNode,
    ShipGraph as ShipGraphInstance,
    ShipGraphOptions,
  } from '@shipgraph/core';

  interface Props {
    /** Raw `graph.json` or canonical GraphData. Reactive. */
    data: RawGraph | GraphData;
    /** Active relation classes (inclusion); null/empty restores all. Reactive. */
    filters?: string[] | null;
    /** Relation classes to hide live (exclusion toggle). Reactive. */
    hiddenRelations?: string[] | null;
    /** Node id to ease the camera to. Reactive. */
    focus?: string | null;
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
    /** A node was clicked. */
    onNode?: (id: string) => void;
    /** A link was clicked (endpoints are node ids). */
    onLink?: (link: GraphLink) => void;
    /** Hovered node id, or null when the pointer leaves. */
    onHover?: (id: string | null) => void;
    /** A node was focused (camera easing began). */
    onFocus?: (id: string) => void;
    /** The core instance is mounted and ready. */
    onReady?: (graph: ShipGraphInstance) => void;
  }

  let {
    data,
    filters = null,
    hiddenRelations = null,
    focus = null,
    focusCommunity = null,
    reducedMotion = undefined,
    draggable = undefined,
    deepLink = true,
    deepLinkParam = 'focus',
    ariaLabel = 'Interactive graph visualization',
    options = undefined,
    onNode,
    onLink,
    onHover,
    onFocus,
    onReady,
  }: Props = $props();

  let container: HTMLDivElement;
  // The instance is an external, non-reactive object; $state only so effects
  // below re-run once it exists.
  let graph = $state<ShipGraphInstance | null>(null);
  const unsubscribers: Array<() => void> = [];

  // First-run guards (plain, non-reactive) so the initial data application
  // (already handed to createGraph) and the deep-link fallback each happen once.
  let dataApplied = false;
  let focusInit = false;

  // --- accessible fallback: a keyboard/SR-navigable list of every node -------
  // Derived straight from the data prop (engine-agnostic), so it works even
  // before/without a rendered canvas — e.g. under SSR hydration or a SR user.
  const nodeList = $derived(
    ((data?.nodes ?? []) as Array<GraphNode | RawNode>).map((n) => ({
      id: n.id,
      label: n.label ?? n.id,
    })),
  );
  let activeIndex = $state(-1);
  const activeAnnouncement = $derived(
    activeIndex >= 0 && activeIndex < nodeList.length ? `Focused ${nodeList[activeIndex].label}` : '',
  );

  function focusIndex(i: number): void {
    if (i < 0 || i >= nodeList.length) return;
    activeIndex = i;
    graph?.focus(nodeList[i].id);
  }

  function onKeydown(e: KeyboardEvent): void {
    const n = nodeList.length;
    if (!n) return;
    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        e.preventDefault();
        focusIndex((activeIndex + 1 + n) % n);
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
        e.preventDefault();
        focusIndex((activeIndex - 1 + n) % n);
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
        if (activeIndex >= 0) {
          e.preventDefault();
          focusIndex(activeIndex);
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
      const value = new URLSearchParams(window.location.search).get(deepLinkParam);
      return value && value.length ? value : null;
    } catch {
      return null;
    }
  }

  // Reconcile the declarative `hiddenRelations` prop with the core toggle state.
  function applyHiddenRelations(g: ShipGraphInstance, list: string[] | null | undefined): void {
    if (list === undefined) return;
    const want = new Set(list ?? []);
    const have = new Set(g.getHiddenRelations());
    for (const r of want) if (!have.has(r)) g.toggleRelation(r, false);
    for (const r of have) if (!want.has(r)) g.toggleRelation(r, true);
  }

  onMount(() => {
    let live = true;
    void (async () => {
      // Runtime-deferred import: a static import would evaluate the Canvas 2D
      // engine (window/document access) at module load, crashing SSR. Loading
      // it here, inside onMount, guarantees client-only evaluation.
      const { createGraph } = await import('@shipgraph/core');
      if (!live || !container) return;
      const g = createGraph(container, data, {
        ...(options ?? {}),
        ...(reducedMotion !== undefined ? { reducedMotion } : {}),
        ...(draggable !== undefined ? { draggable } : {}),
      });
      unsubscribers.push(
        g.on('click', (id) => onNode?.(id)),
        g.on('linkclick', (link) => onLink?.(link)),
        g.on('hover', (id) => onHover?.(id)),
        g.on('focus', (id) => onFocus?.(id)),
      );
      graph = g;
      onReady?.(g);
    })();
    return () => {
      live = false;
      for (const off of unsubscribers) off();
      unsubscribers.length = 0;
      graph?.destroy();
      graph = null;
      dataApplied = false;
      focusInit = false;
    };
  });

  // --- prop reactivity: each change drives an imperative core primitive ------
  // `data` was already handed to createGraph; skip the first run so we don't
  // reset filters/community (setData clears all view state).
  $effect(() => {
    const next = data;
    if (!graph) return;
    if (!dataApplied) {
      dataApplied = true;
      return;
    }
    graph.setData(next);
  });

  $effect(() => {
    const list = filters;
    if (!graph) return;
    graph.setFilters(list && list.length ? list : null);
  });

  $effect(() => {
    const list = hiddenRelations;
    if (!graph) return;
    applyHiddenRelations(graph, list);
  });

  $effect(() => {
    const community = focusCommunity;
    if (!graph) return;
    graph.focusCommunity(community ?? null);
  });

  $effect(() => {
    const on = reducedMotion;
    if (!graph || on === undefined) return;
    graph.setReducedMotion(on);
  });

  $effect(() => {
    const on = draggable;
    if (!graph || on === undefined) return;
    graph.setDraggable(on);
  });

  // Focus: on the first run apply the initial focus (explicit prop wins over the
  // deep link); thereafter follow the `focus` prop when it is set.
  $effect(() => {
    const id = focus;
    if (!graph) return;
    if (!focusInit) {
      focusInit = true;
      const initial = id ?? (deepLink ? readDeepLinkFocus() : null);
      if (initial) graph.focus(initial);
      return;
    }
    if (id) graph.focus(id);
  });
</script>

<div class="shipgraph-root">
  <!-- Deliberate interactive graph region: role="application" + keyboard nav. -->
  <!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
  <div
    bind:this={container}
    class="shipgraph"
    tabindex="0"
    role="application"
    aria-label={ariaLabel}
    aria-describedby="shipgraph-sr-help"
    aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight Home End Enter"
    onkeydown={onKeydown}
  ></div>
  <!-- Screen-reader + keyboard fallback. Visually hidden but fully navigable:
       one accessible entry per node, each focuses its node on activation. -->
  <p id="shipgraph-sr-help" class="sg-sr-only">
    Interactive graph. Use arrow keys to move between {nodeList.length} nodes and Enter to focus one.
  </p>
  <ul class="sg-sr-only shipgraph-node-list" aria-label="Graph nodes">
    {#each nodeList as n, i (n.id)}
      <li>
        <button
          type="button"
          aria-current={i === activeIndex ? 'true' : undefined}
          onclick={() => focusIndex(i)}
        >
          {n.label}
        </button>
      </li>
    {/each}
  </ul>
  <p class="sg-sr-only" aria-live="polite">{activeAnnouncement}</p>
</div>

<style>
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
