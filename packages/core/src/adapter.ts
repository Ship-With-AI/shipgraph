// Data adapter: ingest StackMap's real `graph.json` schema and map it to
// shipgraph's canonical GraphData. Pure and framework-free.
import type { GraphData, GraphLink, GraphNode, RawGraph } from './types';

const DEFAULT_WEIGHT = 0.5;

/**
 * Map a raw graph (StackMap `graph.json`) to canonical GraphData.
 *
 * - `file_type` -> `type`, `community_name` -> `communityName`.
 * - `weight` defaults to 0.5 when absent/null.
 * - Links whose endpoints are missing from the node set are dropped (dangling).
 * - `degree` is computed from the surviving links.
 *
 * `RawNode`/`RawLink` are fully typed (declared optional fields + an index
 * signature for extra JSON), so every read below is compiler-checked.
 */
export function adapt(raw: RawGraph): GraphData {
  const nodes: GraphNode[] = raw.nodes.map((n) => ({
    id: n.id,
    label: n.label ?? n.id,
    type: n.file_type ?? null,
    community: normalizeCommunity(n.community),
    communityName: n.community_name ?? null,
    degree: 0,
  }));

  const byId = new Map(nodes.map((n) => [n.id, n]));
  const links: GraphLink[] = [];
  for (const l of raw.links) {
    const s = byId.get(l.source);
    const t = byId.get(l.target);
    if (!s || !t) continue; // drop dangling links
    links.push({
      source: l.source,
      target: l.target,
      relation: l.relation ?? 'related_to',
      weight: normalizeWeight(l.weight),
    });
    s.degree++;
    t.degree++;
  }

  return { nodes, links };
}

/** True when the input is already canonical GraphData (nodes carry `degree`). */
export function isGraphData(data: RawGraph | GraphData): data is GraphData {
  const first: unknown = data.nodes[0];
  if (first === undefined) return true; // empty: treat as canonical (no-op)
  return typeof first === 'object' && first !== null && 'degree' in first;
}

/**
 * Accept either raw or canonical data and return canonical GraphData with
 * degrees recomputed from the (surviving) links.
 */
export function toGraphData(data: RawGraph | GraphData): GraphData {
  if (!isGraphData(data)) return adapt(data);
  const nodes: GraphNode[] = data.nodes.map((n) => ({ ...n, degree: 0 }));
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const links: GraphLink[] = [];
  for (const l of data.links) {
    const source = typeof l.source === 'string' ? l.source : String(l.source);
    const target = typeof l.target === 'string' ? l.target : String(l.target);
    const s = byId.get(source);
    const t = byId.get(target);
    if (!s || !t) continue;
    links.push({ source, target, relation: l.relation, weight: normalizeWeight(l.weight) });
    s.degree++;
    t.degree++;
  }
  return { nodes, links };
}

function normalizeCommunity(v: number | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  return Number.isFinite(v) ? v : null;
}

function normalizeWeight(v: number | null | undefined): number {
  if (v === null || v === undefined) return DEFAULT_WEIGHT;
  return Number.isFinite(v) ? v : DEFAULT_WEIGHT;
}
