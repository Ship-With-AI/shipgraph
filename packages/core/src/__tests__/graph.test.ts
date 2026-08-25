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
} from '../engine/types';
import type { GraphData, GraphLink, RawGraph } from '../types';

// Minimal GraphEngine double. Stores the last data pushed by the feel layer and
// no-ops everything else; nodePosition returns null (headless: no layout).
class FakeEngine implements GraphEngine {
  lastData: GraphData = { nodes: [], links: [] };
  nodeRenderer: NodeRenderer | null = null;

  mount(): void {}
  setData(data: GraphData): void {
    this.lastData = data;
  }
  getData(): GraphData {
    return this.lastData;
  }
  configurePhysics(_p: EnginePhysics): void {}
  reheat(): void {}
  setCooldownTicks(_ticks: number): void {}
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
  onNodeClick(_cb: (id: string) => void): void {}
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
