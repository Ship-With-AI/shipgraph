// The ONLY module that imports the concrete engine (force-graph). Everything
// else in @shipgraph/core sees the engine exclusively through the GraphEngine
// interface, so nothing force-graph-shaped escapes into the public API.
import ForceGraph, { type NodeObject, type LinkObject } from 'force-graph';
import type { GraphData, GraphLink, GraphNode } from '../types';
import type {
  EnginePhysics,
  GraphEngine,
  LinkColorFn,
  LinkWidthFn,
  NodeRenderer,
  RenderNode,
} from './types';

// force-graph's node objects are our GraphNode plus the simulation fields
// (x/y/vx/vy/fx/fy/index) that d3-force stamps on at runtime.
type FGNode = GraphNode & NodeObject;
type FGLink = GraphLink & LinkObject<FGNode>;
type FGInstance = ForceGraph<FGNode, FGLink>;

// force-graph's default export is *typed* as a class but is actually a Kapsule
// factory called as `ForceGraph()(element)`. Model that at this one boundary.
type FGFactory = () => (element: HTMLElement) => FGInstance;
const createForceGraph = ForceGraph as unknown as FGFactory;

function idOf(end: string | number | FGNode | undefined): string {
  if (end == null) return '';
  if (typeof end === 'object') return String(end.id);
  return String(end);
}

// Map an engine link back to shipgraph's engine-neutral GraphLink (id endpoints).
function toGraphLink(l: FGLink): GraphLink {
  return {
    source: idOf(l.source),
    target: idOf(l.target),
    relation: l.relation,
    weight: l.weight,
  };
}

export class ForceGraphEngine implements GraphEngine {
  private fg: FGInstance | null = null;
  private container: HTMLElement | null = null;
  private byId = new Map<string, FGNode>();
  private nodeRenderer: NodeRenderer | null = null;
  private linkColorFn: LinkColorFn | null = null;
  private linkWidthFn: LinkWidthFn | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private readonly backgroundColor: string;

  constructor(backgroundColor = '#0b0f14') {
    this.backgroundColor = backgroundColor;
  }

  private inst(): FGInstance {
    if (!this.fg) throw new Error('ForceGraphEngine: mount(container) first');
    return this.fg;
  }

  mount(container: HTMLElement): void {
    this.container = container;
    const fg = createForceGraph()(container);
    fg.backgroundColor(this.backgroundColor)
      .nodeId('id')
      .nodeRelSize(4)
      .nodeVal((n) => 1 + Math.sqrt(n.degree))
      .nodeLabel((n) => `${n.label}${n.communityName ? ' · ' + n.communityName : ''}`)
      .nodeCanvasObjectMode(() => 'replace')
      .nodeCanvasObject((n, ctx, scale) => {
        // n carries live x/y from the simulation; RenderNode makes that explicit.
        if (this.nodeRenderer) this.nodeRenderer(n as unknown as RenderNode, ctx, scale);
      })
      .linkColor((l) => (this.linkColorFn ? this.linkColorFn(l, idOf(l.source), idOf(l.target)) : 'rgba(120,140,160,.22)'))
      .linkWidth((l) => (this.linkWidthFn ? this.linkWidthFn(l, idOf(l.source), idOf(l.target)) : 1));
    this.fg = fg;
    // force-graph defaults width/height to the WINDOW, not the mount element, and
    // never re-measures. Left alone, the canvas is viewport-sized inside whatever
    // box it was given: the drawing surface overflows its frame and the layout
    // centers on the wrong origin. Adopt the container's box and track it.
    this.syncSize();
    this.observeSize(container);
  }

  /** Match the drawing surface to the mount element. No-op until it has a box. */
  private syncSize(): void {
    const { fg, container } = this;
    if (!fg || !container) return;
    const w = container.clientWidth;
    const h = container.clientHeight;
    // A zero box means "not laid out yet" (hidden tab, lazy mount). Keep the
    // current size and wait for the observer rather than collapsing to nothing.
    if (w <= 0 || h <= 0) return;
    if (fg.width() !== w) fg.width(w);
    if (fg.height() !== h) fg.height(h);
  }

  private observeSize(container: HTMLElement): void {
    // Guard: absent under SSR and in some test environments.
    if (typeof ResizeObserver === 'undefined') return;
    this.resizeObserver = new ResizeObserver(() => this.syncSize());
    this.resizeObserver.observe(container);
  }

  setData(data: GraphData): void {
    const fg = this.inst();
    // Pass our own node/link objects so identity + layout positions persist.
    const nodes = data.nodes as FGNode[];
    const links = data.links as FGLink[];
    this.byId = new Map(nodes.map((n) => [n.id, n]));
    fg.graphData({ nodes, links });
  }

  getData(): GraphData {
    const fg = this.inst();
    const { nodes, links } = fg.graphData();
    return {
      nodes: nodes.map((n) => ({
        id: n.id,
        label: n.label,
        type: n.type,
        community: n.community,
        communityName: n.communityName,
        degree: n.degree,
      })),
      links: links.map(
        (l): GraphLink => ({
          source: idOf(l.source),
          target: idOf(l.target),
          relation: l.relation,
          weight: l.weight,
        }),
      ),
    };
  }

  configurePhysics(p: EnginePhysics): void {
    const fg = this.inst();
    const charge = fg.d3Force('charge');
    if (charge) {
      charge.strength(p.chargeStrength);
      charge.distanceMax(p.chargeDistanceMax);
    }
    const link = fg.d3Force('link');
    if (link) {
      link.distance((l: FGLink) => p.linkDistance(l));
      link.strength(p.linkStrength);
    }
  }

  reheat(): void {
    this.inst().d3ReheatSimulation();
  }

  setCooldownTicks(ticks: number): void {
    this.inst().cooldownTicks(ticks);
  }

  setAutoPauseRedraw(on: boolean): void {
    this.inst().autoPauseRedraw(on);
  }

  centerAt(x: number, y: number, ms: number): void {
    this.inst().centerAt(x, y, ms);
  }

  zoom(k: number, ms: number): void {
    this.inst().zoom(k, ms);
  }

  getZoom(): number {
    return this.inst().zoom();
  }

  zoomToFit(ms: number, padding: number): void {
    this.inst().zoomToFit(ms, padding);
  }

  nodePosition(id: string): { x: number; y: number } | null {
    const n = this.byId.get(id);
    if (!n || n.x == null || n.y == null) return null;
    return { x: n.x, y: n.y };
  }

  pinNode(id: string): void {
    const n = this.byId.get(id);
    if (n) {
      n.fx = n.x;
      n.fy = n.y;
    }
  }

  unpinNode(id: string): void {
    const n = this.byId.get(id);
    if (n) {
      n.fx = undefined;
      n.fy = undefined;
    }
  }

  setDraggable(on: boolean): void {
    this.inst().enableNodeDrag(on);
  }

  setNodeRenderer(fn: NodeRenderer): void {
    this.nodeRenderer = fn;
  }

  setLinkColor(fn: LinkColorFn): void {
    this.linkColorFn = fn;
  }

  setLinkWidth(fn: LinkWidthFn): void {
    this.linkWidthFn = fn;
  }

  refresh(): void {
    // Re-assigning the same data pointer triggers a repaint without relayout.
    const fg = this.inst();
    fg.nodeColor(fg.nodeColor());
  }

  setCursor(cursor: string): void {
    if (this.container) this.container.style.cursor = cursor;
  }

  onNodeHover(cb: (id: string | null) => void): void {
    this.inst().onNodeHover((n) => cb(n ? String(n.id) : null));
  }

  onNodeClick(cb: (id: string) => void): void {
    this.inst().onNodeClick((n) => cb(String(n.id)));
  }

  onBackgroundClick(cb: () => void): void {
    this.inst().onBackgroundClick(() => cb());
  }

  onNodeDrag(cb: (id: string) => void): void {
    this.inst().onNodeDrag((n) => cb(String(n.id)));
  }

  onNodeDragEnd(cb: (id: string) => void): void {
    this.inst().onNodeDragEnd((n) => cb(String(n.id)));
  }

  onLinkHover(cb: (link: GraphLink | null) => void): void {
    this.inst().onLinkHover((l) => cb(l ? toGraphLink(l) : null));
  }

  onLinkClick(cb: (link: GraphLink) => void): void {
    this.inst().onLinkClick((l) => cb(toGraphLink(l)));
  }

  onRenderFramePre(cb: () => void): void {
    this.inst().onRenderFramePre(() => cb());
  }

  onEngineStop(cb: () => void): void {
    this.inst().onEngineStop(cb);
  }

  destroy(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    if (this.fg) {
      this.fg._destructor();
      this.fg = null;
    }
    this.byId.clear();
    this.container = null;
  }
}
