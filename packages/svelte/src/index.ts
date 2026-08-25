// @shipgraph/svelte — public surface. The Svelte component plus re-exported,
// engine-agnostic core types. No force-graph type reaches this surface.
export { default as ShipGraph } from './ShipGraph.svelte';

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
