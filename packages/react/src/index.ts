// @shipgraph/react — public surface. The React component + hook plus
// re-exported, engine-agnostic core types. No force-graph type reaches this
// surface.
export { ShipGraph, default } from './ShipGraph';
export type { ShipGraphProps } from './ShipGraph';
export { useShipGraph } from './useShipGraph';
export type { UseShipGraphOptions, UseShipGraphResult } from './useShipGraph';

export type {
  GraphNode,
  GraphLink,
  GraphData,
  RawNode,
  RawLink,
  RawGraph,
  PhysicsOptions,
  ShipGraphOptions,
  ShipGraph as ShipGraphInstance,
  ShipGraphEvent,
  ShipGraphEventMap,
} from '@shipgraph/core';
