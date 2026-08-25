// The engine seam. shipgraph talks to rendering/physics ONLY through this
// interface, so the concrete engine (currently force-graph) can be swapped
// (e.g. for a WebGL backend) without touching the public API or feel layer.
//
// IMPORTANT: no concrete-engine type may appear here. This file is
// engine-agnostic by contract.
import type { GraphData, GraphLink } from '../types';

/** A node as seen at render time: shipgraph data plus live layout position. */
export interface RenderNode {
  id: string;
  label: string;
  type: string | null;
  community: number | null;
  communityName: string | null;
  degree: number;
  /** Live simulation coordinates (set by the engine). */
  x: number;
  y: number;
}

/** Engine-neutral physics configuration. */
export interface EnginePhysics {
  chargeStrength: number;
  chargeDistanceMax: number;
  /** Rest distance for a link, in px. */
  linkDistance: (link: GraphLink) => number;
  linkStrength: number;
}

/** Draws a single node onto the canvas (feel layer supplies this). */
export type NodeRenderer = (
  node: RenderNode,
  ctx: CanvasRenderingContext2D,
  globalScale: number,
) => void;

/** Per-link style resolvers. Endpoint ids are passed to avoid allocation. */
export type LinkColorFn = (link: GraphLink, sourceId: string, targetId: string) => string;
export type LinkWidthFn = (link: GraphLink, sourceId: string, targetId: string) => number;

/**
 * The rendering + physics engine contract. All parameters and return types are
 * shipgraph-owned or primitive — deliberately free of any concrete engine type.
 */
export interface GraphEngine {
  mount(container: HTMLElement): void;
  setData(data: GraphData): void;
  /** Canonical data with endpoints normalized back to ids. */
  getData(): GraphData;

  configurePhysics(physics: EnginePhysics): void;
  reheat(): void;
  /** Number of cooldown ticks (0 = settle immediately, Infinity = never). */
  setCooldownTicks(ticks: number): void;
  /**
   * Control the engine's redraw auto-pause. When enabled (default) the engine
   * stops repainting once the layout settles, to save CPU. Reduced motion must
   * disable it so hover/highlight/drag keep repainting after the simulation has
   * stopped.
   */
  setAutoPauseRedraw(on: boolean): void;

  centerAt(x: number, y: number, ms: number): void;
  zoom(k: number, ms: number): void;
  getZoom(): number;
  zoomToFit(ms: number, padding: number): void;

  /** Live position of a node, or null if unknown. */
  nodePosition(id: string): { x: number; y: number } | null;
  pinNode(id: string): void;
  unpinNode(id: string): void;
  setDraggable(on: boolean): void;

  setNodeRenderer(fn: NodeRenderer): void;
  setLinkColor(fn: LinkColorFn): void;
  setLinkWidth(fn: LinkWidthFn): void;
  /** Force a repaint after style state changes. */
  refresh(): void;
  setCursor(cursor: string): void;

  onNodeHover(cb: (id: string | null) => void): void;
  onNodeClick(cb: (id: string) => void): void;
  /** Fires when the empty canvas background is clicked (not a node/link). */
  onBackgroundClick(cb: () => void): void;
  onNodeDrag(cb: (id: string) => void): void;
  onNodeDragEnd(cb: (id: string) => void): void;
  onLinkHover(cb: (link: GraphLink | null) => void): void;
  onLinkClick(cb: (link: GraphLink) => void): void;
  onRenderFramePre(cb: () => void): void;
  onEngineStop(cb: () => void): void;

  destroy(): void;
}
