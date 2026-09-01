// @vitest-environment jsdom
// Feel-layer behavior for edge-type filters and community focus, exercised over
// a fake in-memory engine (createGraphWithEngine). No canvas/force-graph: the
// fake captures the GraphData the feel layer pushes down, so we can assert
// exactly which links/nodes survive a toggle and which nodes a community focus
// emphasizes vs dims.
import { beforeEach, describe, expect, it } from 'vitest';
import { createGraphWithEngine } from '../graph';
import type {
  EnginePhysics,
  GraphEngine,
  LinkColorFn,
  LinkWidthFn,
  NodeRenderer,
  RenderNode,
} from '../engine/types';
import type { GraphData, GraphLink, RawGraph } from '../types';

// Minimal GraphEngine double. Stores the last data pushed by the feel layer and
// no-ops everything else; nodePosition returns null (headless: no layout).
class FakeEngine implements GraphEngine {
  lastData: GraphData = { nodes: [], links: [] };
  nodeRenderer: NodeRenderer | null = null;
  autoPauseRedraw = true;
  cooldownTicks: number | null = null;
  reheatCount = 0;
  clickCb: ((id: string) => void) | null = null;
  bgClickCb: (() => void) | null = null;

  mount(): void {}
  setData(data: GraphData): void {
    this.lastData = data;
  }
  getData(): GraphData {
    return this.lastData;
  }
  configurePhysics(_p: EnginePhysics): void {}
  reheat(): void {
    this.reheatCount++;
  }
  setCooldownTicks(ticks: number): void {
    this.cooldownTicks = ticks;
  }
  setAutoPauseRedraw(on: boolean): void {
    this.autoPauseRedraw = on;
  }
  centerAt(_x: number, _y: number, _ms: number): void {}
  zoom(_k: number, _ms: number): void {}
  getZoom(): number {
    return 1;
  }
  zoomToFit(_ms: number, _padding: number): void {}
  nodePosition(): { x: number; y: number } | null {
    return null;
  }
  pinNode(): void {}
  unpinNode(): void {}
  setDraggable(_on: boolean): void {}
  setNodeRenderer(fn: NodeRenderer): void {
    this.nodeRenderer = fn;
  }
  setLinkColor(_fn: LinkColorFn): void {}
  setLinkWidth(_fn: LinkWidthFn): void {}
  refresh(): void {}
  setCursor(_cursor: string): void {}
  onNodeHover(_cb: (id: string | null) => void): void {}
  onNodeClick(cb: (id: string) => void): void {
    this.clickCb = cb;
  }
  onBackgroundClick(cb: () => void): void {
    this.bgClickCb = cb;
  }
  onNodeDrag(_cb: (id: string) => void): void {}
  onNodeDragEnd(_cb: (id: string) => void): void {}
  onLinkHover(_cb: (link: GraphLink | null) => void): void {}
  onLinkClick(_cb: (link: GraphLink) => void): void {}
  onRenderFramePre(_cb: () => void): void {}
  onEngineStop(_cb: () => void): void {}
  destroy(): void {}
}

const raw: RawGraph = {
  nodes: [
    { id: 'a', label: 'A', community: 1 },
    { id: 'b', label: 'B', community: 1 },
    { id: 'c', label: 'C', community: 2 },
    { id: 'd', label: 'D', community: 2 },
  ],
  links: [
    { source: 'a', target: 'b', relation: 'references' },
    { source: 'b', target: 'c', relation: 'similar_to' },
    { source: 'c', target: 'd', relation: 'references' },
  ],
};

const container = {} as unknown as HTMLElement;
let engine: FakeEngine;

beforeEach(() => {
  engine = new FakeEngine();
});

describe('edge-type filters (toggleRelation)', () => {
  it('hides exactly the toggled relation and keeps the others', () => {
    const g = createGraphWithEngine(container, engine, raw);
    // Baseline: all three links visible.
    expect(engine.lastData.links).toHaveLength(3);

    g.toggleRelation('references');

    // Only the two `references` links are gone; the `similar_to` link survives.
    const visible = engine.lastData.links;
    expect(visible.every((l) => l.relation !== 'references')).toBe(true);
    expect(visible.map((l) => l.relation)).toEqual(['similar_to']);
    expect(g.getHiddenRelations()).toEqual(['references']);
    // getData() agrees with what the engine received.
    expect(g.getData().links).toHaveLength(1);
  });

  it('is reversible: toggling the same relation restores its links', () => {
    const g = createGraphWithEngine(container, engine, raw);
    g.toggleRelation('references');
    expect(engine.lastData.links).toHaveLength(1);
    g.toggleRelation('references');
    expect(engine.lastData.links).toHaveLength(3);
    expect(g.getHiddenRelations()).toEqual([]);
  });

  it('honors an explicit visible flag (idempotent hide/show)', () => {
    const g = createGraphWithEngine(container, engine, raw);
    g.toggleRelation('similar_to', false); // hide
    g.toggleRelation('similar_to', false); // still hidden
    expect(engine.lastData.links.some((l) => l.relation === 'similar_to')).toBe(false);
    g.toggleRelation('similar_to', true); // show
    expect(engine.lastData.links.some((l) => l.relation === 'similar_to')).toBe(true);
  });
});

describe('community / family focus (focusCommunity)', () => {
  it('highlights members and dims non-members', () => {
    const g = createGraphWithEngine(container, engine, raw);
    g.focusCommunity(1);

    expect(g.getFocusedCommunity()).toBe(1);
    expect(g.getHighlightedNodes().sort()).toEqual(['a', 'b']);
    // Members are not dimmed; non-members are.
    expect(g.isDimmed('a')).toBe(false);
    expect(g.isDimmed('b')).toBe(false);
    expect(g.isDimmed('c')).toBe(true);
    expect(g.isDimmed('d')).toBe(true);
  });

  it('clears the focus with null (nothing highlighted or dimmed)', () => {
    const g = createGraphWithEngine(container, engine, raw);
    g.focusCommunity(1);
    g.focusCommunity(null);
    expect(g.getFocusedCommunity()).toBeNull();
    expect(g.getHighlightedNodes()).toEqual([]);
    expect(g.isDimmed('c')).toBe(false);
  });

  it('setData resets an active community focus', () => {
    const g = createGraphWithEngine(container, engine, raw);
    g.focusCommunity(1);
    g.setData(raw);
    expect(g.getFocusedCommunity()).toBeNull();
    expect(g.getHighlightedNodes()).toEqual([]);
  });
});

describe('render loop stays interactive (autoPauseRedraw off) + reduced motion', () => {
  it('disables autoPauseRedraw on construction so interaction never freezes', () => {
    createGraphWithEngine(container, engine, raw);
    // force-graph never wakes redraw on pointer move; keeping auto-pause off
    // means the shadow hit-test canvas keeps refreshing after the layout
    // settles, so hover/click/selection stay responsive.
    expect(engine.autoPauseRedraw).toBe(false);
  });

  it('reduced motion settles instantly and keeps repaint alive', () => {
    const g = createGraphWithEngine(container, engine, raw);
    g.setReducedMotion(true);
    expect(engine.cooldownTicks).toBe(0);
    expect(engine.autoPauseRedraw).toBe(false);
  });

  it('disabling reduced motion resumes the engine, still repainting', () => {
    const g = createGraphWithEngine(container, engine, raw);
    g.setReducedMotion(true);
    g.setReducedMotion(false);
    expect(engine.cooldownTicks).toBe(Infinity);
    expect(engine.autoPauseRedraw).toBe(false);
  });
});

describe('selection (select / click / background)', () => {
  it('select sets the node and getSelected reflects it', () => {
    const g = createGraphWithEngine(container, engine, raw);
    expect(g.getSelected()).toBeNull();
    g.select('b');
    expect(g.getSelected()).toBe('b');
  });

  it('select(null) clears the selection', () => {
    const g = createGraphWithEngine(container, engine, raw);
    g.select('b');
    g.select(null);
    expect(g.getSelected()).toBeNull();
  });

  it('emits select on every change (including clear)', () => {
    const g = createGraphWithEngine(container, engine, raw);
    const seen: (string | null)[] = [];
    g.on('select', (id) => seen.push(id));
    g.select('a');
    g.select(null);
    expect(seen).toEqual(['a', null]);
  });

  it('clicking a node selects it (engine onNodeClick → select)', () => {
    const g = createGraphWithEngine(container, engine, raw);
    engine.clickCb?.('c');
    expect(g.getSelected()).toBe('c');
  });

  it('a background click clears the selection', () => {
    const g = createGraphWithEngine(container, engine, raw);
    g.select('a');
    engine.bgClickCb?.();
    expect(g.getSelected()).toBeNull();
  });

  it('setData resets an active selection', () => {
    const g = createGraphWithEngine(container, engine, raw);
    g.select('a');
    g.setData(raw);
    expect(g.getSelected()).toBeNull();
  });
});

// The renderer is the only place node fill is decided, so drive it directly:
// run the captured NodeRenderer over a recording 2D context and read fillStyle
// back. The node body is the last arc filled before stroke/label work.
function paint(engine: FakeEngine, node: { id: string; community?: number | null }): string {
  let pending = '';
  let body = '';
  let arcs = 0;
  const ctx = {
    set fillStyle(v: string) {
      pending = v;
    },
    get fillStyle() {
      return pending;
    },
    beginPath() {},
    arc() {
      arcs++;
    },
    fill() {
      body = pending;
    },
    stroke() {},
    fillText() {},
    strokeStyle: '',
    lineWidth: 0,
    font: '',
  } as unknown as CanvasRenderingContext2D;
  const full: RenderNode = {
    id: node.id,
    label: node.id,
    type: null,
    community: node.community ?? null,
    communityName: null,
    degree: 1,
    x: 0,
    y: 0,
  };
  engine.nodeRenderer?.(full, ctx, 1);
  if (arcs === 0) throw new Error('renderer drew nothing');
  return body;
}

describe('nodeColor option', () => {
  it('defaults to the built-in community palette', () => {
    createGraphWithEngine(container, engine, raw);
    // Same community → same color; different community → different color.
    expect(paint(engine, { id: 'a', community: 1 })).toBe(paint(engine, { id: 'b', community: 1 }));
    expect(paint(engine, { id: 'a', community: 1 })).not.toBe(
      paint(engine, { id: 'c', community: 2 }),
    );
  });

  it('lets the caller color by something other than community', () => {
    const byId: Record<string, string> = { a: '#ff0000', b: '#00ff00' };
    createGraphWithEngine(container, engine, raw, {
      nodeColor: (n) => byId[n.id] ?? '#888888',
    });
    // Both are community 1, so only the override can tell them apart.
    expect(paint(engine, { id: 'a', community: 1 })).toBe('#ff0000');
    expect(paint(engine, { id: 'b', community: 1 })).toBe('#00ff00');
    expect(paint(engine, { id: 'c', community: 2 })).toBe('#888888');
  });
});

// Labels are drawn at a constant ~11 CSS px, so visibility is a crowding
// decision, not a legibility one. Capture whether fillText ran for a node.
function labelled(engine: FakeEngine, id: string, scale: number): boolean {
  let drew = false;
  const ctx = {
    set fillStyle(_v: string) {},
    get fillStyle() {
      return '';
    },
    beginPath() {},
    arc() {},
    fill() {},
    stroke() {},
    fillText() {
      drew = true;
    },
    strokeStyle: '',
    lineWidth: 0,
    font: '',
  } as unknown as CanvasRenderingContext2D;
  engine.nodeRenderer?.(
    { id, label: id, type: null, community: null, communityName: null, degree: 1, x: 0, y: 0 },
    ctx,
    scale,
  );
  return drew;
}

function bigGraph(nodeCount: number): RawGraph {
  const nodes = Array.from({ length: nodeCount }, (_, i) => ({ id: `n${i}`, label: `N${i}` }));
  return { nodes, links: [] };
}

describe('label crowding (labelMaxNodes)', () => {
  it('names every node when the rendered graph is small, without zooming', () => {
    createGraphWithEngine(container, engine, raw);
    expect(labelled(engine, 'a', 1)).toBe(true);
  });

  it('holds labels back on a dense graph until you zoom in', () => {
    createGraphWithEngine(container, engine, bigGraph(200));
    expect(labelled(engine, 'n0', 1)).toBe(false);
    expect(labelled(engine, 'n0', 3)).toBe(true);
  });

  it('names a dense graph once a filter thins it out', () => {
    // The regression this fixes: picking a topic left ~50 nodes on screen at a
    // fit zoom below 2, so nothing was named until the user zoomed by hand.
    const g = createGraphWithEngine(container, engine, {
      nodes: bigGraph(200).nodes,
      links: [{ source: 'n0', target: 'n1', relation: 'references' }],
    });
    expect(labelled(engine, 'n0', 1)).toBe(false);

    g.setData(bigGraph(40));
    expect(labelled(engine, 'n0', 1)).toBe(true);
  });

  it('honors an explicit ceiling', () => {
    createGraphWithEngine(container, engine, raw, { labelMaxNodes: 0 });
    expect(labelled(engine, 'a', 1)).toBe(false);
    expect(labelled(engine, 'a', 3)).toBe(true);
  });
});
