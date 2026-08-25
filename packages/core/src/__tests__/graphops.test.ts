import { describe, expect, it } from 'vitest';
import {
  applyView,
  buildAdjacency,
  collapseTargets,
  communityMembers,
  endpointId,
  relationsOf,
} from '../graphops';
import type { GraphData } from '../types';

// A --references--> B, A --cites--> C, B --references--> D (D is a leaf off B),
// plus E hanging solely off A (leaf).
const data: GraphData = {
  nodes: [
    { id: 'A', label: 'A', type: null, community: 0, communityName: null, degree: 3 },
    { id: 'B', label: 'B', type: null, community: 0, communityName: null, degree: 2 },
    { id: 'C', label: 'C', type: null, community: 1, communityName: null, degree: 1 },
    { id: 'D', label: 'D', type: null, community: 1, communityName: null, degree: 1 },
    { id: 'E', label: 'E', type: null, community: 2, communityName: null, degree: 1 },
  ],
  links: [
    { source: 'A', target: 'B', relation: 'references', weight: 1 },
    { source: 'A', target: 'C', relation: 'cites', weight: 0.5 },
    { source: 'B', target: 'D', relation: 'references', weight: 1 },
    { source: 'A', target: 'E', relation: 'cites', weight: 0.2 },
  ],
};

const allVisible = () => new Set(data.nodes.map((n) => n.id));

describe('endpointId', () => {
  it('handles string and object endpoints', () => {
    expect(endpointId('X')).toBe('X');
    expect(endpointId({ id: 'Y' })).toBe('Y');
  });
});

describe('buildAdjacency', () => {
  it('is undirected and complete', () => {
    const adj = buildAdjacency(data);
    expect([...(adj.get('A') ?? [])].sort()).toEqual(['B', 'C', 'E']);
    expect([...(adj.get('B') ?? [])].sort()).toEqual(['A', 'D']);
    expect([...(adj.get('D') ?? [])]).toEqual(['B']);
  });
});

describe('relationsOf', () => {
  it('returns sorted unique relation classes', () => {
    expect(relationsOf(data)).toEqual(['cites', 'references']);
  });
});

describe('applyView (filters)', () => {
  it('keeps all links when relations is null/empty', () => {
    expect(applyView(data, null, new Set()).links).toHaveLength(4);
    expect(applyView(data, [], new Set()).links).toHaveLength(4);
  });

  it('restricts to the given relation classes', () => {
    const view = applyView(data, ['references'], new Set());
    expect(view.links.map((l) => l.relation).every((r) => r === 'references')).toBe(true);
    expect(view.links).toHaveLength(2);
  });

  it('drops hidden nodes and their incident links', () => {
    const view = applyView(data, null, new Set(['E']));
    expect(view.nodes.map((n) => n.id)).not.toContain('E');
    expect(view.links.some((l) => l.source === 'E' || l.target === 'E')).toBe(false);
    expect(view.links).toHaveLength(3);
  });

  it('drops links of hidden relation classes (independent of inclusion)', () => {
    // Hide `references`: the two references links go, the two `cites` links stay.
    const view = applyView(data, null, new Set(), new Set(['references']));
    expect(view.links.every((l) => l.relation !== 'references')).toBe(true);
    expect(view.links.map((l) => l.relation).sort()).toEqual(['cites', 'cites']);
  });

  it('combines inclusion filter and hidden relations', () => {
    // Keep only `references`, but also hide `references` -> nothing remains.
    const view = applyView(data, ['references'], new Set(), new Set(['references']));
    expect(view.links).toHaveLength(0);
  });
});

describe('communityMembers', () => {
  it('returns the node ids in a given community', () => {
    expect(communityMembers(data, 0).sort()).toEqual(['A', 'B']);
    expect(communityMembers(data, 1).sort()).toEqual(['C', 'D']);
    expect(communityMembers(data, 2)).toEqual(['E']);
  });

  it('returns an empty list for an absent community', () => {
    expect(communityMembers(data, 99)).toEqual([]);
  });
});

describe('collapseTargets', () => {
  it('hides only leaf neighbors (single visible connection)', () => {
    // Collapsing A: B stays (also links to D), C is a leaf off A, E is a leaf off A.
    const targets = collapseTargets('A', buildAdjacency(data), allVisible()).sort();
    expect(targets).toEqual(['C', 'E']);
  });

  it('collapsing B hides its leaf D', () => {
    const targets = collapseTargets('B', buildAdjacency(data), allVisible());
    expect(targets).toEqual(['D']);
  });

  it('returns nothing for an unknown node', () => {
    expect(collapseTargets('ZZZ', buildAdjacency(data), allVisible())).toEqual([]);
  });

  it('respects already-hidden nodes when judging leaf status', () => {
    // With D already hidden, B becomes a leaf off A (only visible neighbor is A).
    const visible = new Set(['A', 'B', 'C', 'E']);
    const targets = collapseTargets('A', buildAdjacency(data), visible).sort();
    expect(targets).toEqual(['B', 'C', 'E']);
  });
});
