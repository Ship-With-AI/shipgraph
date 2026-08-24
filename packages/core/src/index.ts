// @shipgraph/core — framework-agnostic graph visualization core.
//
// Public surface only. The concrete engine (force-graph) is wired in behind
// the GraphEngine seam and never appears in any exported type.

export { createGraph, createGraphWithEngine } from './graph';
export { adapt, toGraphData, isGraphData } from './adapter';
export { buildAdjacency, applyView, collapseTargets, relationsOf, endpointId } from './graphops';

export type {
  GraphNode,
  GraphLink,
  GraphData,
  RawNode,
  RawLink,
  RawGraph,
  PhysicsOptions,
  ShipGraphOptions,
  ShipGraph,
  ShipGraphEvent,
  ShipGraphEventMap,
} from './types';

// Engine seam — engine-agnostic by contract, so advanced consumers can supply
// a custom rendering/physics backend.
export type {
  GraphEngine,
  RenderNode,
  EnginePhysics,
  NodeRenderer,
  LinkColorFn,
  LinkWidthFn,
} from './engine/types';
