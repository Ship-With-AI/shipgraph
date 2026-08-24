import { describe, expect, it } from 'vitest';
import { adapt, isGraphData, toGraphData } from '../adapter';
import type { RawGraph } from '../types';

// Fixture mirrors StackMap's real graph.json shape:
//   nodes {id,label,file_type,community,community_name, ...extra}
//   links {source,target,relation,weight, ...extra}
const fixture: RawGraph = {
  directed: false,
  nodes: [
    {
      id: 'repos_langgraph',
      label: 'LangGraph',
      file_type: 'document',
      community: 0,
      community_name: 'LLM Codebase Memory',
      norm_label: 'langgraph',
      source_url: null,
    },
    {
      id: 'repos_agent_memory',
      label: 'Agent Memory',
      file_type: 'repo',
      community: 3,
      community_name: 'Memory Systems',
    },
    {
      // missing weight + missing community_name; community present
      id: 'repos_acontext',
      label: 'acontext',
      file_type: 'document',
      community: 3,
      community_name: null,
    },
  ],
  links: [
    {
      source: 'repos_agent_memory',
      target: 'repos_langgraph',
      relation: 'conceptually_related_to',
      weight: 0.6,
      confidence: 'EXTRACTED',
    },
    {
      // no weight -> should default to 0.5
      source: 'repos_acontext',
      target: 'repos_langgraph',
      relation: 'references',
    },
    {
      // dangling: target not in node set -> must be dropped
      source: 'repos_langgraph',
      target: 'repos_missing',
      relation: 'cites',
      weight: 1,
    },
  ],
};

describe('adapt', () => {
  it('maps the real node schema to canonical fields', () => {
    const { nodes } = adapt(fixture);
    expect(nodes).toHaveLength(3);
    expect(nodes[0]).toMatchObject({
      id: 'repos_langgraph',
      label: 'LangGraph',
      type: 'document',
      community: 0,
      communityName: 'LLM Codebase Memory',
    });
    // community_name null survives as null; type from file_type
    expect(nodes[2]).toMatchObject({ id: 'repos_acontext', type: 'document', communityName: null });
  });

  it('drops dangling links and defaults missing weight to 0.5', () => {
    const { links } = adapt(fixture);
    // 3 raw links, one dangling -> 2 kept
    expect(links).toHaveLength(2);
    const byRel = new Map(links.map((l) => [l.relation, l]));
    expect(byRel.get('conceptually_related_to')?.weight).toBe(0.6);
    expect(byRel.get('references')?.weight).toBe(0.5);
    expect(byRel.has('cites')).toBe(false); // dangling dropped
  });

  it('computes degree from surviving links only', () => {
    const { nodes } = adapt(fixture);
    const deg = new Map(nodes.map((n) => [n.id, n.degree]));
    // langgraph: linked from agent_memory + acontext = 2 (dangling cites dropped)
    expect(deg.get('repos_langgraph')).toBe(2);
    expect(deg.get('repos_agent_memory')).toBe(1);
    expect(deg.get('repos_acontext')).toBe(1);
  });

  it('preserves canonical endpoints as string ids', () => {
    const { links } = adapt(fixture);
    for (const l of links) {
      expect(typeof l.source).toBe('string');
      expect(typeof l.target).toBe('string');
    }
  });
});

describe('isGraphData / toGraphData', () => {
  it('detects raw vs canonical input', () => {
    expect(isGraphData(fixture)).toBe(false);
    const canonical = adapt(fixture);
    expect(isGraphData(canonical)).toBe(true);
  });

  it('toGraphData recomputes degrees for canonical input', () => {
    const canonical = adapt(fixture);
    // corrupt the degree, then re-derive
    canonical.nodes[0].degree = 999;
    const fixed = toGraphData(canonical);
    expect(fixed.nodes[0].degree).toBe(2);
  });

  it('toGraphData routes raw input through adapt', () => {
    const out = toGraphData(fixture);
    expect(out.nodes).toHaveLength(3);
    expect(out.links).toHaveLength(2);
  });
});
