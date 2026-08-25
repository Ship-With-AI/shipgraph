// useShipGraph — the reactive/lifecycle heart of @shipgraph/react. It owns the
// core instance: mounts it (client-only), maps prop changes to the core's
// imperative feel primitives, relays core events to callbacks, and tears it
// down on unmount. The <ShipGraph> component is a thin view over this hook; you
// can also drive your own container with it directly.
//
// SSR safety: nothing here touches window/document at module scope, and the
// core (which pulls in the Canvas 2D engine) is loaded via a dynamic import
// inside an effect — effects never run on the server, so this can't crash SSR.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type {
  GraphData,
  GraphLink,
  RawGraph,
  ShipGraph as ShipGraphInstance,
  ShipGraphOptions,
} from '@shipgraph/core';

export interface UseShipGraphOptions {
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
  /** The persistent selection changed (null clears). */
  onSelect?: (id: string | null) => void;
  /** The core instance is mounted and ready. */
  onReady?: (graph: ShipGraphInstance) => void;
}

export interface UseShipGraphResult {
  /** The live core instance, or null before mount / after unmount. */
  graph: ShipGraphInstance | null;
  /** Ease the camera to a node. */
  focusNode: (id: string) => void;
  /** Hide/show a relation class live (flips when `visible` omitted). */
  toggleRelation: (relation: string, visible?: boolean) => void;
  /** Isolate + highlight a community (null clears). */
  focusCommunity: (community: number | null) => void;
}

// Read `?<param>=<slug>` from the URL. Client-only; returns null under SSR (no
// window) so it can never crash on the server.
function readDeepLinkFocus(param: string): string | null {
  if (typeof window === 'undefined' || !window.location) return null;
  try {
    const value = new URLSearchParams(window.location.search).get(param);
    return value && value.length ? value : null;
  } catch {
    return null;
  }
}

// Reconcile the declarative `hiddenRelations` prop with the core's toggle state.
function applyHiddenRelations(g: ShipGraphInstance, list: string[] | null | undefined): void {
  if (list === undefined) return;
  const want = new Set(list ?? []);
  const have = new Set(g.getHiddenRelations());
  for (const r of want) if (!have.has(r)) g.toggleRelation(r, false);
  for (const r of have) if (!want.has(r)) g.toggleRelation(r, true);
}

export function useShipGraph(
  containerRef: RefObject<HTMLElement | null>,
  opts: UseShipGraphOptions,
): UseShipGraphResult {
  const {
    data,
    filters = null,
    hiddenRelations = null,
    focus = null,
    selected = null,
    focusCommunity = null,
    reducedMotion,
    draggable,
    deepLink = true,
    deepLinkParam = 'focus',
    options,
    onNode,
    onLink,
    onHover,
    onFocus,
    onSelect,
    onReady,
  } = opts;

  // The instance drives a re-render when ready so the prop-sync effects below
  // (which no-op while it is null) fire exactly once it exists.
  const [graph, setGraph] = useState<ShipGraphInstance | null>(null);

  // Latest-callback ref: event handlers are subscribed once on the core, but
  // always call the newest callbacks — so inline arrow props never resubscribe.
  const callbacks = useRef({ onNode, onLink, onHover, onFocus, onSelect, onReady });
  callbacks.current = { onNode, onLink, onHover, onFocus, onSelect, onReady };

  // First-run guards so initial data application (already handed to createGraph)
  // and the deep-link fallback each happen exactly once per instance.
  const dataApplied = useRef(false);
  const focusInit = useRef(false);

  // --- lifecycle: create the core (client-only) and relay events ------------
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let live = true;
    let instance: ShipGraphInstance | null = null;
    const unsubs: Array<() => void> = [];

    void (async () => {
      // Runtime-deferred import: a static import would evaluate the Canvas 2D
      // engine (window/document access) at module load, crashing SSR. Loading
      // it here, inside an effect, guarantees client-only evaluation.
      const { createGraph } = await import('@shipgraph/core');
      if (!live || !containerRef.current) return;
      const g = createGraph(containerRef.current, data, {
        ...(options ?? {}),
        ...(reducedMotion !== undefined ? { reducedMotion } : {}),
        ...(draggable !== undefined ? { draggable } : {}),
      });
      instance = g;
      unsubs.push(
        g.on('click', (id) => callbacks.current.onNode?.(id)),
        g.on('linkclick', (link) => callbacks.current.onLink?.(link)),
        g.on('hover', (id) => callbacks.current.onHover?.(id)),
        g.on('focus', (id) => callbacks.current.onFocus?.(id)),
        g.on('select', (id) => callbacks.current.onSelect?.(id)),
      );
      setGraph(g);
      callbacks.current.onReady?.(g);
    })();

    return () => {
      live = false;
      for (const off of unsubs) off();
      instance?.destroy();
      dataApplied.current = false;
      focusInit.current = false;
      setGraph(null);
    };
    // Construction inputs are captured once; later changes flow through the
    // dedicated sync effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef]);

  // --- prop reactivity: each change drives an imperative core primitive -----
  // `data` was already handed to createGraph; skip the first run so we don't
  // reset filters/community (setData clears all view state).
  useEffect(() => {
    if (!graph) return;
    if (!dataApplied.current) {
      dataApplied.current = true;
      return;
    }
    graph.setData(data);
  }, [graph, data]);

  useEffect(() => {
    if (!graph) return;
    graph.setFilters(filters && filters.length ? filters : null);
  }, [graph, filters]);

  useEffect(() => {
    if (!graph) return;
    applyHiddenRelations(graph, hiddenRelations);
  }, [graph, hiddenRelations]);

  useEffect(() => {
    if (!graph) return;
    graph.focusCommunity(focusCommunity ?? null);
  }, [graph, focusCommunity]);

  useEffect(() => {
    if (!graph) return;
    graph.select(selected ?? null);
  }, [graph, selected]);

  useEffect(() => {
    if (!graph || reducedMotion === undefined) return;
    graph.setReducedMotion(reducedMotion);
  }, [graph, reducedMotion]);

  useEffect(() => {
    if (!graph || draggable === undefined) return;
    graph.setDraggable(draggable);
  }, [graph, draggable]);

  // Focus: on the first run apply the initial focus (explicit prop wins over
  // the deep link); thereafter follow the `focus` prop when it is set.
  useEffect(() => {
    if (!graph) return;
    if (!focusInit.current) {
      focusInit.current = true;
      const initial = focus ?? (deepLink ? readDeepLinkFocus(deepLinkParam) : null);
      if (initial) graph.focus(initial);
      return;
    }
    if (focus) graph.focus(focus);
  }, [graph, focus, deepLink, deepLinkParam]);

  const focusNode = useCallback((id: string) => graph?.focus(id), [graph]);
  const toggleRelation = useCallback(
    (relation: string, visible?: boolean) => graph?.toggleRelation(relation, visible),
    [graph],
  );
  const focusCommunityFn = useCallback(
    (community: number | null) => graph?.focusCommunity(community),
    [graph],
  );

  return { graph, focusNode, toggleRelation, focusCommunity: focusCommunityFn };
}
