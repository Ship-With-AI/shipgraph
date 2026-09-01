// The feel layer + public ShipGraph implementation. Owns hover halo, eased
// focus camera, spring-back drag, reduced-motion, relation filters and
// expand/collapse — all expressed against the GraphEngine seam, never the
// concrete engine.
import { toGraphData } from './adapter';
import type { GraphEngine, RenderNode } from './engine/types';
import { ForceGraphEngine } from './engine/forceGraphEngine';
import {
  applyView,
  buildAdjacency,
  collapseTargets,
  communityMembers,
  endpointId,
  relationsOf,
} from './graphops';
import type {
  GraphData,
  GraphLink,
  GraphNode,
  RawGraph,
  ShipGraph,
  ShipGraphEvent,
  ShipGraphEventMap,
  ShipGraphOptions,
} from './types';

const DEFAULTS = {
  backgroundColor: '#0b0f14',
  focusTransitionMs: 700,
  focusZoom: 4,
  chargeStrength: -140,
  chargeDistanceMax: 420,
  linkDistanceBase: 30,
  linkDistanceSpread: 40,
  linkStrength: 0.5,
  // Above this many rendered nodes, labels only appear once you zoom in. Sized
  // to comfortably cover a filtered view while still holding back a full graph.
  labelMaxNodes: 120,
} as const;

// Deterministic community palette (hue rotates per community id).
function communityColor(c: number | null): string {
  if (c == null) return 'hsl(210 12% 58%)';
  return `hsl(${(c * 47) % 360} 68% 62%)`;
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

class ShipGraphImpl implements ShipGraph {
  private readonly engine: GraphEngine;
  private readonly opts: Required<
    Omit<ShipGraphOptions, 'physics' | 'reducedMotion' | 'nodeColor'>
  > & { nodeColor: (node: GraphNode) => string };
  private readonly physics: Required<NonNullable<ShipGraphOptions['physics']>>;

  private full: GraphData = { nodes: [], links: [] };
  private adj = new Map<string, Set<string>>();
  private allRelations: string[] = [];
  private activeRelations: string[] | null = null;
  private readonly hidden = new Set<string>();
  private readonly hiddenBy = new Map<string, string>();
  private readonly collapsed = new Set<string>();
  private readonly hiddenRelations = new Set<string>();
  private focusedCommunity: number | null = null;
  private highlightSet: Set<string> | null = null;

  private hoverNode: string | null = null;
  private hoverSet = new Set<string>();
  private selectedNode: string | null = null;
  private selectedSet = new Set<string>();
  /** Nodes currently pushed to the engine — drives label crowding. */
  private visibleNodeCount = 0;
  private reduceMotion: boolean;

  private readonly listeners: { [E in ShipGraphEvent]: Set<(p: ShipGraphEventMap[E]) => void> } = {
    hover: new Set(),
    click: new Set(),
    select: new Set(),
    linkhover: new Set(),
    linkclick: new Set(),
    focus: new Set(),
    settle: new Set(),
    dragend: new Set(),
    frame: new Set(),
  };

  constructor(container: HTMLElement, options: ShipGraphOptions, engine: GraphEngine) {
    this.engine = engine;
    this.opts = {
      backgroundColor: options.backgroundColor ?? DEFAULTS.backgroundColor,
      focusTransitionMs: options.focusTransitionMs ?? DEFAULTS.focusTransitionMs,
      focusZoom: options.focusZoom ?? DEFAULTS.focusZoom,
      respectReducedMotion: options.respectReducedMotion ?? true,
      draggable: options.draggable ?? true,
      labelMaxNodes: options.labelMaxNodes ?? DEFAULTS.labelMaxNodes,
      nodeColor: options.nodeColor ?? ((n) => communityColor(n.community)),
    };
    this.physics = {
      chargeStrength: options.physics?.chargeStrength ?? DEFAULTS.chargeStrength,
      chargeDistanceMax: options.physics?.chargeDistanceMax ?? DEFAULTS.chargeDistanceMax,
      linkDistanceBase: options.physics?.linkDistanceBase ?? DEFAULTS.linkDistanceBase,
      linkDistanceSpread: options.physics?.linkDistanceSpread ?? DEFAULTS.linkDistanceSpread,
      linkStrength: options.physics?.linkStrength ?? DEFAULTS.linkStrength,
    };
    this.reduceMotion =
      options.reducedMotion ?? (this.opts.respectReducedMotion && prefersReducedMotion());

    this.engine.mount(container);
    this.wireStyling();
    this.wireInteraction();
    this.applyPhysics();
    this.engine.setDraggable(this.opts.draggable);
    // Keep the render loop alive for the graph's whole life. force-graph pauses
    // redraw once the layout settles (autoPauseRedraw), and its pointer handler
    // never wakes it — so a settled graph stops refreshing the shadow hit-test
    // canvas, killing hover/click/selection until reload. Disabling auto-pause
    // keeps interaction responsive at any time (and covers reduced motion,
    // which settles instantly).
    this.engine.setAutoPauseRedraw(false);
  }

  // --- setup ----------------------------------------------------------------

  private applyPhysics(): void {
    const { linkDistanceBase: base, linkDistanceSpread: spread } = this.physics;
    this.engine.configurePhysics({
      chargeStrength: this.physics.chargeStrength,
      chargeDistanceMax: this.physics.chargeDistanceMax,
      linkDistance: (l: GraphLink) => base + spread * (1 - (l.weight ?? 0.5)),
      linkStrength: this.physics.linkStrength,
    });
  }

  private wireStyling(): void {
    this.engine.setNodeRenderer((n: RenderNode, ctx, scale) => {
      const r = (1 + Math.sqrt(n.degree)) * 1.6;
      // Transient hover takes priority; otherwise the persistent selection
      // drives the 1-hop emphasis. Either way a focal node + its neighbors stay
      // lit and the rest are dimmed.
      const hoverActive = this.hoverNode !== null;
      const focusNode = hoverActive ? this.hoverNode : this.selectedNode;
      const focusSet = hoverActive ? this.hoverSet : this.selectedSet;
      const focusActive = focusNode !== null;
      const inFocus = focusActive && focusSet.has(n.id);
      const community = this.highlightSet;
      const isMember = community !== null && community.has(n.id);
      const commDim = community !== null && !isMember;
      const dim = (focusActive && !inFocus) || commDim;
      // 1-hop halo for the focal set (hover or selection).
      if (focusActive && inFocus) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, r + 6, 0, 2 * Math.PI);
        ctx.fillStyle = n.id === focusNode ? 'rgba(110,231,183,.28)' : 'rgba(110,231,183,.14)';
        ctx.fill();
      }
      // Community focus ring: emphasize members even without a hover/selection.
      if (isMember && !focusActive) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, r + 5, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(110,231,183,.16)';
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(n.x, n.y, r, 0, 2 * Math.PI);
      ctx.fillStyle = dim ? 'rgba(90,105,120,.25)' : this.opts.nodeColor(n);
      ctx.fill();
      if (n.id === focusNode || (isMember && !focusActive)) {
        ctx.lineWidth = 1.5 / scale;
        ctx.strokeStyle = n.id === focusNode ? '#eafff5' : 'rgba(110,231,183,.9)';
        ctx.stroke();
      }
      // Persistent selection ring: always mark the selected node, even while
      // hovering elsewhere, so the selection is never visually lost.
      if (n.id === this.selectedNode) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, r + 3.5, 0, 2 * Math.PI);
        ctx.lineWidth = 2 / scale;
        ctx.strokeStyle = '#eafff5';
        ctx.stroke();
      }
      // Labels render at a constant ~11 CSS px (the 1/scale cancels the camera
      // transform), so zoom was never about legibility — only about crowding.
      // Gate on how many nodes are actually on screen instead: a filtered or
      // naturally small graph gets named immediately, a dense one waits for a
      // zoom that spreads it out. The selected node is always named.
      const roomForLabels = this.visibleNodeCount <= this.opts.labelMaxNodes;
      if ((!dim && (roomForLabels || scale > 2)) || n.id === this.selectedNode) {
        ctx.font = `${11 / scale}px ui-sans-serif, sans-serif`;
        ctx.fillStyle = 'rgba(230,237,243,.85)';
        ctx.fillText(n.label, n.x + r + 2, n.y + 3 / scale);
      }
    });

    // Links follow the same focal set (hover, else selection), then community.
    this.engine.setLinkColor((_l, s, t) => {
      const set = this.hoverNode ? this.hoverSet : this.selectedNode ? this.selectedSet : null;
      if (set) {
        return set.has(s) && set.has(t) ? 'rgba(110,231,183,.9)' : 'rgba(120,140,160,.06)';
      }
      if (this.highlightSet) {
        return this.highlightSet.has(s) && this.highlightSet.has(t)
          ? 'rgba(110,231,183,.7)'
          : 'rgba(120,140,160,.05)';
      }
      return 'rgba(120,140,160,.22)';
    });
    this.engine.setLinkWidth((_l, s, t) => {
      const set = this.hoverNode ? this.hoverSet : this.selectedNode ? this.selectedSet : null;
      if (set) {
        return set.has(s) && set.has(t) ? 2.5 : 0.5;
      }
      if (this.highlightSet) {
        return this.highlightSet.has(s) && this.highlightSet.has(t) ? 2 : 0.5;
      }
      return 1;
    });
  }

  private wireInteraction(): void {
    this.engine.onNodeHover((id) => {
      this.setHover(id);
      this.engine.setCursor(id ? 'pointer' : '');
      this.emit('hover', id);
    });
    this.engine.onNodeClick((id) => {
      // Clicking a node makes it the persistent selection AND eases the camera
      // to it. Clicking a neighbor carries the exploration to that node.
      this.select(id);
      this.focus(id);
      this.emit('click', id);
    });
    this.engine.onBackgroundClick(() => this.select(null));
    this.engine.onLinkHover((link) => this.emit('linkhover', link));
    this.engine.onLinkClick((link) => this.emit('linkclick', link));
    // Spring-back drag: pin while dragging; on release, unpin + reheat so the
    // physics reels the node home. Reduced motion keeps it pinned (no bounce).
    this.engine.onNodeDrag((id) => this.engine.pinNode(id));
    this.engine.onNodeDragEnd((id) => {
      if (this.reduceMotion) {
        this.engine.pinNode(id);
      } else {
        this.engine.unpinNode(id);
        this.engine.reheat();
      }
      this.emit('dragend', id);
    });
    this.engine.onEngineStop(() => this.emit('settle', undefined));
    this.engine.onRenderFramePre(() => this.emit('frame', undefined));
  }

  private setHover(id: string | null): void {
    this.hoverNode = id;
    const set = new Set<string>();
    if (id) {
      for (const nb of this.adj.get(id) ?? []) set.add(nb);
    }
    this.hoverSet = set;
  }

  private camMs(): number {
    return this.reduceMotion ? 0 : this.opts.focusTransitionMs;
  }

  private visibleIds(): Set<string> {
    const s = new Set<string>();
    for (const n of this.full.nodes) if (!this.hidden.has(n.id)) s.add(n.id);
    return s;
  }

  private rebuild(): void {
    const view = applyView(this.full, this.activeRelations, this.hidden, this.hiddenRelations);
    this.visibleNodeCount = view.nodes.length;
    this.engine.setData(view);
    this.engine.refresh();
  }

  private emit<E extends ShipGraphEvent>(event: E, payload: ShipGraphEventMap[E]): void {
    for (const fn of this.listeners[event]) fn(payload);
  }

  // --- public API -----------------------------------------------------------

  setData(input: RawGraph | GraphData): void {
    this.full = toGraphData(input);
    this.adj = buildAdjacency(this.full);
    this.allRelations = relationsOf(this.full);
    this.activeRelations = null;
    this.hidden.clear();
    this.hiddenBy.clear();
    this.collapsed.clear();
    this.hiddenRelations.clear();
    this.focusedCommunity = null;
    this.highlightSet = null;
    this.hoverNode = null;
    this.hoverSet = new Set();
    this.selectedNode = null;
    this.selectedSet = new Set();
    this.rebuild();
  }

  getData(): GraphData {
    return applyView(this.full, this.activeRelations, this.hidden, this.hiddenRelations);
  }

  getFullData(): GraphData {
    return this.full;
  }

  focus(nodeId: string): void {
    const pos = this.engine.nodePosition(nodeId);
    if (!pos) return;
    this.engine.centerAt(pos.x, pos.y, this.camMs());
    this.engine.zoom(this.reduceMotion ? this.engine.getZoom() : this.opts.focusZoom, this.camMs());
    this.emit('focus', nodeId);
  }

  fit(ms?: number): void {
    this.engine.zoomToFit(ms ?? this.camMs(), 40);
  }

  setFilters(relations: string[] | null): void {
    this.activeRelations = relations && relations.length ? relations.slice() : null;
    this.rebuild();
  }

  getRelations(): string[] {
    return this.allRelations.slice();
  }

  toggleRelation(relation: string, visible?: boolean): void {
    const hide = visible === undefined ? !this.hiddenRelations.has(relation) : !visible;
    if (hide) this.hiddenRelations.add(relation);
    else this.hiddenRelations.delete(relation);
    this.rebuild();
  }

  getHiddenRelations(): string[] {
    return [...this.hiddenRelations].sort();
  }

  focusCommunity(community: number | null): void {
    this.focusedCommunity = community;
    if (community === null) {
      this.highlightSet = null;
      this.engine.refresh();
      return;
    }
    const members = communityMembers(this.full, community);
    this.highlightSet = new Set(members);
    // Ease the camera to the members' centroid so the community "isolates"
    // into view. Positions may be unset (pre-layout / headless) — skip then.
    let sx = 0;
    let sy = 0;
    let count = 0;
    for (const id of members) {
      const pos = this.engine.nodePosition(id);
      if (!pos) continue;
      sx += pos.x;
      sy += pos.y;
      count++;
    }
    if (count > 0) this.engine.centerAt(sx / count, sy / count, this.camMs());
    this.engine.refresh();
  }

  getFocusedCommunity(): number | null {
    return this.focusedCommunity;
  }

  getHighlightedNodes(): string[] {
    return this.highlightSet ? [...this.highlightSet] : [];
  }

  isDimmed(nodeId: string): boolean {
    return this.highlightSet !== null && !this.highlightSet.has(nodeId);
  }

  hoverHalo(nodeId: string | null): void {
    this.setHover(nodeId);
    this.engine.refresh();
  }

  select(nodeId: string | null): void {
    if (nodeId === null) {
      if (this.selectedNode === null) return;
      this.selectedNode = null;
      this.selectedSet = new Set();
      this.engine.refresh();
      this.emit('select', null);
      return;
    }
    this.selectedNode = nodeId;
    const set = new Set<string>([nodeId]);
    for (const nb of this.adj.get(nodeId) ?? []) set.add(nb);
    this.selectedSet = set;
    this.engine.refresh();
    this.emit('select', nodeId);
  }

  getSelected(): string | null {
    return this.selectedNode;
  }

  collapse(nodeId: string): void {
    const targets = collapseTargets(nodeId, this.adj, this.visibleIds());
    if (!targets.length) {
      this.collapsed.add(nodeId);
      return;
    }
    for (const t of targets) {
      this.hidden.add(t);
      this.hiddenBy.set(t, nodeId);
    }
    this.collapsed.add(nodeId);
    this.rebuild();
  }

  expand(nodeId: string): void {
    let changed = false;
    for (const [hiddenId, by] of this.hiddenBy) {
      if (by === nodeId) {
        this.hidden.delete(hiddenId);
        this.hiddenBy.delete(hiddenId);
        changed = true;
      }
    }
    this.collapsed.delete(nodeId);
    if (changed) this.rebuild();
  }

  isCollapsed(nodeId: string): boolean {
    return this.collapsed.has(nodeId);
  }

  setDraggable(on: boolean): void {
    this.engine.setDraggable(on);
  }

  setReducedMotion(on: boolean): void {
    this.reduceMotion = on;
    // Reduced motion settles the layout immediately and drops camera easing.
    // (autoPauseRedraw stays off for the graph's whole life — see the
    // constructor — so interaction keeps working after this instant settle.)
    this.engine.setCooldownTicks(on ? 0 : Infinity);
    this.engine.reheat();
  }

  reheat(): void {
    this.engine.reheat();
  }

  on<E extends ShipGraphEvent>(event: E, handler: (payload: ShipGraphEventMap[E]) => void): () => void {
    this.listeners[event].add(handler);
    return () => this.listeners[event].delete(handler);
  }

  destroy(): void {
    for (const key of Object.keys(this.listeners) as ShipGraphEvent[]) this.listeners[key].clear();
    this.engine.destroy();
  }
}

/**
 * Create a shipgraph instance mounted into `container`.
 *
 * The returned object is engine-agnostic; the underlying engine is wired in
 * internally and never surfaces in this signature.
 */
export function createGraph(
  container: HTMLElement,
  data?: RawGraph | GraphData,
  options: ShipGraphOptions = {},
): ShipGraph {
  const engine = new ForceGraphEngine(options.backgroundColor ?? DEFAULTS.backgroundColor);
  const graph = new ShipGraphImpl(container, options, engine);
  if (data) graph.setData(data);
  return graph;
}

// Exposed for callers that want to compose the feel layer over a custom engine
// implementation (advanced/testing). Still engine-agnostic: `engine` is typed
// as GraphEngine, not the concrete class.
export function createGraphWithEngine(
  container: HTMLElement,
  engine: GraphEngine,
  data?: RawGraph | GraphData,
  options: ShipGraphOptions = {},
): ShipGraph {
  const graph = new ShipGraphImpl(container, options, engine);
  if (data) graph.setData(data);
  return graph;
}

export { endpointId };
