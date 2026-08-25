// Pure graph operations shared by the feel layer: adjacency, relation filters,
// and expand/collapse visibility. Kept side-effect free and unit-tested.
import type { GraphData, GraphLink } from './types';

/** Resolve a link endpoint to its node id (engine may replace it with an object). */
export function endpointId(end: unknown): string {
  if (typeof end === 'string') return end;
  if (end && typeof end === 'object' && 'id' in (end as Record<string, unknown>)) {
    return String((end as { id: unknown }).id);
  }
  return String(end);
}

/** Undirected 1-hop adjacency map (node id -> set of neighbor ids). */
export function buildAdjacency(data: GraphData): Map<string, Set<string>> {
  const adj = new Map<string, Set<string>>();
  const add = (a: string, b: string) => {
    let s = adj.get(a);
    if (!s) adj.set(a, (s = new Set<string>()));
    s.add(b);
  };
  for (const l of data.links) {
    const s = endpointId(l.source);
    const t = endpointId(l.target);
    add(s, t);
    add(t, s);
  }
  return adj;
}

/** Sorted, de-duplicated relation classes present in the data. */
export function relationsOf(data: GraphData): string[] {
  const set = new Set<string>();
  for (const l of data.links) set.add(l.relation);
  return [...set].sort();
}

/**
 * Apply relation filters + collapsed-node hiding to produce the visible graph.
 *
 * - `relations`: keep only links of these classes (null/empty = keep all).
 * - `hidden`: node ids removed from view; links touching them are dropped.
 * - `hiddenRelations`: relation classes to hide live (their links are dropped
 *   even when `relations` would otherwise keep them).
 *
 * Returns a new GraphData referencing the SAME node/link objects (no clone) so
 * the engine keeps stable identities and layout positions across updates.
 */
export function applyView(
  full: GraphData,
  relations: string[] | null,
  hidden: ReadonlySet<string>,
  hiddenRelations?: ReadonlySet<string>,
): GraphData {
  const relSet = relations && relations.length ? new Set(relations) : null;
  const hideRel = hiddenRelations && hiddenRelations.size ? hiddenRelations : null;
  const nodes = hidden.size ? full.nodes.filter((n) => !hidden.has(n.id)) : full.nodes;
  const links = full.links.filter((l: GraphLink) => {
    if (relSet && !relSet.has(l.relation)) return false;
    if (hideRel && hideRel.has(l.relation)) return false;
    if (hidden.size) {
      if (hidden.has(endpointId(l.source))) return false;
      if (hidden.has(endpointId(l.target))) return false;
    }
    return true;
  });
  return { nodes, links };
}

/** Node ids belonging to a given community (a "family"). Pure. */
export function communityMembers(data: GraphData, community: number | null): string[] {
  const out: string[] = [];
  for (const n of data.nodes) if (n.community === community) out.push(n.id);
  return out;
}

/**
 * Nodes to hide when collapsing `nodeId`: direct neighbors whose only visible
 * connection is to `nodeId` (leaf neighbors). Deterministic and pure.
 *
 * `visible` = currently visible node ids; `adj` = full-graph adjacency.
 */
export function collapseTargets(
  nodeId: string,
  adj: Map<string, Set<string>>,
  visible: ReadonlySet<string>,
): string[] {
  const neighbors = adj.get(nodeId);
  if (!neighbors) return [];
  const out: string[] = [];
  for (const nb of neighbors) {
    if (!visible.has(nb)) continue;
    const nbAdj = adj.get(nb);
    if (!nbAdj) continue;
    // Hide nb iff every visible neighbor of nb is the node being collapsed.
    let onlyThrough = true;
    for (const x of nbAdj) {
      if (x === nodeId) continue;
      if (visible.has(x)) {
        onlyThrough = false;
        break;
      }
    }
    if (onlyThrough) out.push(nb);
  }
  return out;
}
