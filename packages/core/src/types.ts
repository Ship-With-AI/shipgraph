// Public, engine-agnostic types for @shipgraph/core.
// Nothing here references the underlying rendering/physics engine.

/** A node in shipgraph's own data model (engine-independent). */
export interface GraphNode {
  id: string;
  label: string;
  /** Original `file_type` from the source graph (e.g. "document", "repo"). */
  type: string | null;
  /** Community id the node belongs to. */
  community: number | null;
  /** Human-readable community name. */
  communityName: string | null;
  /** Degree (link count) computed by the adapter. */
  degree: number;
}

/** A link in shipgraph's own data model. Endpoints are always node ids. */
export interface GraphLink {
  source: string;
  target: string;
  /** Relation class, e.g. "references", "semantically_similar_to". */
  relation: string;
  /** Normalized 0..1 weight; defaults to 0.5 when absent. */
  weight: number;
}

/** shipgraph's canonical graph data. */
export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

// --- Raw ingest schema (StackMap `graph.json`) ------------------------------
// The adapter ingests this shape and maps it to GraphData. Extra fields are
// tolerated and ignored, so real exports can be fed in verbatim.

export interface RawNode {
  id: string;
  label: string;
  file_type?: string | null;
  community?: number | null;
  community_name?: string | null;
  [k: string]: unknown;
}

export interface RawLink {
  source: string;
  target: string;
  relation: string;
  weight?: number | null;
  [k: string]: unknown;
}

export interface RawGraph {
  nodes: RawNode[];
  links: RawLink[];
  [k: string]: unknown;
}

// --- createGraph options ----------------------------------------------------

/** Physics ("elasticity") tuning. Values are engine-neutral. */
export interface PhysicsOptions {
  /** Repulsion strength (negative = repel). Default -140. */
  chargeStrength?: number;
  /** Max distance repulsion acts over. Default 420. */
  chargeDistanceMax?: number;
  /** Base link rest distance in px. Default 30. */
  linkDistanceBase?: number;
  /** Extra rest distance scaled by (1 - weight). Default 40. */
  linkDistanceSpread?: number;
  /** Link spring stiffness 0..1. Default 0.5. */
  linkStrength?: number;
}

export interface ShipGraphOptions {
  /** Canvas background color. Default "#0b0f14". */
  backgroundColor?: string;
  /** Physics tuning. */
  physics?: PhysicsOptions;
  /** Eased focus/zoom duration in ms. Default 700. */
  focusTransitionMs?: number;
  /** Zoom level applied on focus(). Default 4. */
  focusZoom?: number;
  /** Honor prefers-reduced-motion (drops easing to 0ms). Default true. */
  respectReducedMotion?: boolean;
  /** Allow dragging nodes with spring-back on release. Default true. */
  draggable?: boolean;
  /**
   * Provide the reduced-motion preference explicitly (e.g. for tests/SSR).
   * When omitted, the browser `matchMedia` value is used if available.
   */
  reducedMotion?: boolean;
}

export type ShipGraphEvent =
  | 'hover'
  | 'click'
  | 'linkhover'
  | 'linkclick'
  | 'focus'
  | 'settle'
  | 'dragend'
  | 'frame';

export interface ShipGraphEventMap {
  hover: string | null;
  click: string;
  /** 1-hop link hover (null clears). Endpoints are node ids. */
  linkhover: GraphLink | null;
  /** Link click. Endpoints are node ids. */
  linkclick: GraphLink;
  /** Fires when a node is focused (camera easing begins). */
  focus: string;
  settle: void;
  dragend: string;
  /** Fires before each engine render frame (drive perf HUDs / overlays). */
  frame: void;
}

/**
 * The public shipgraph instance. Every method is engine-agnostic — no
 * concrete-engine type appears in this surface.
 */
export interface ShipGraph {
  /** Replace the graph data. Accepts raw `graph.json` or canonical GraphData. */
  setData(data: RawGraph | GraphData): void;
  /** Current canonical data (respects active filters/collapse). */
  getData(): GraphData;
  /** The full, unfiltered dataset. */
  getFullData(): GraphData;
  /** Ease the camera to center + zoom a node. */
  focus(nodeId: string): void;
  /** Fit the whole (visible) graph in view. */
  fit(ms?: number): void;
  /** Restrict to these relation classes; null/empty restores all. */
  setFilters(relations: string[] | null): void;
  /** All relation classes present in the full dataset (sorted). */
  getRelations(): string[];
  /**
   * Toggle visibility of a relation class live (hide/show its links). When
   * `visible` is omitted the current state is flipped. Independent of
   * `setFilters`: a relation hidden here stays hidden regardless of the
   * inclusion filter.
   */
  toggleRelation(relation: string, visible?: boolean): void;
  /** Relation classes currently hidden by `toggleRelation` (sorted). */
  getHiddenRelations(): string[];
  /**
   * Isolate + highlight a community ("family"): its members are emphasized and
   * every other node/link is dimmed. Pass null to clear the focus.
   */
  focusCommunity(community: number | null): void;
  /** The community currently focused, or null. */
  getFocusedCommunity(): number | null;
  /** Node ids highlighted by the active community focus (empty when none). */
  getHighlightedNodes(): string[];
  /** True when a community focus is active and this node is not a member. */
  isDimmed(nodeId: string): boolean;
  /** Programmatically drive the 1-hop hover halo (null clears it). */
  hoverHalo(nodeId: string | null): void;
  /** Hide neighbors that hang solely off this node. */
  collapse(nodeId: string): void;
  /** Restore neighbors previously hidden by collapsing this node. */
  expand(nodeId: string): void;
  isCollapsed(nodeId: string): boolean;
  /** Enable/disable node dragging (spring-back on release). */
  setDraggable(on: boolean): void;
  /** Toggle the reduced-motion path at runtime. */
  setReducedMotion(on: boolean): void;
  /** Re-energize the physics simulation. */
  reheat(): void;
  /** Subscribe to an event. Returns an unsubscribe function. */
  on<E extends ShipGraphEvent>(
    event: E,
    handler: (payload: ShipGraphEventMap[E]) => void,
  ): () => void;
  /** Tear down the instance and release the container. */
  destroy(): void;
}
