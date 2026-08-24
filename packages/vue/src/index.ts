// @shipgraph/vue — public surface. The Vue component plus re-exported,
// engine-agnostic core types. No force-graph type reaches this surface.
export { default as ShipGraph } from './ShipGraph.vue';

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
