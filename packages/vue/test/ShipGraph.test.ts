// Component tests for <ShipGraph>. The core is mocked so the binding contract
// (mount, prop reactivity, event relaying, teardown) is tested deterministically
// under jsdom — with no canvas/WebGL — exactly where SSR-unsafe code would blow
// up if it ran. Real-engine behavior is covered by the puppeteer perf harness.
import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GraphLink } from '../src/index';

// A per-run registry of the event handlers the component subscribes on the core,
// so a test can fire a core event and assert the corresponding Vue emit.
const handlers = new Map<string, (p: unknown) => void>();

const instance = {
  setData: vi.fn(),
  setFilters: vi.fn(),
  focus: vi.fn(),
  setReducedMotion: vi.fn(),
  setDraggable: vi.fn(),
  reheat: vi.fn(),
  destroy: vi.fn(),
  getData: vi.fn(() => ({ nodes: [], links: [] })),
  toggleRelation: vi.fn(),
  getHiddenRelations: vi.fn((): string[] => []),
  focusCommunity: vi.fn(),
  on: vi.fn((event: string, fn: (p: unknown) => void) => {
    handlers.set(event, fn);
    return () => handlers.delete(event);
  }),
};

const createGraph = vi.fn((_container: HTMLElement, _data?: unknown, _options?: unknown) => instance);

// Intercepts both static and the component's dynamic `import('@shipgraph/core')`.
vi.mock('@shipgraph/core', () => ({ createGraph }));

// `vi.mock` is hoisted above this import by vitest, so the mock is in place.
import { ShipGraph } from '../src/index';

const data = { nodes: [{ id: 'a', label: 'A', file_type: 'doc' }], links: [] };

beforeEach(() => {
  vi.clearAllMocks();
  handlers.clear();
});

describe('<ShipGraph>', () => {
  it('mounts under jsdom without crashing and renders a container', async () => {
    const w = mount(ShipGraph, { props: { data } });
    await flushPromises();
    expect(w.find('.shipgraph').exists()).toBe(true);
    expect(createGraph).toHaveBeenCalledTimes(1);
    // createGraph(container, data, options)
    expect(createGraph.mock.calls[0][1]).toEqual(data);
  });

  it('applies initial filters and focus on mount when provided', async () => {
    mount(ShipGraph, { props: { data, filters: ['references'], focus: 'a' } });
    await flushPromises();
    expect(instance.setFilters).toHaveBeenCalledWith(['references']);
    expect(instance.focus).toHaveBeenCalledWith('a');
  });

  it('reacts to `data` prop changes via setData', async () => {
    const w = mount(ShipGraph, { props: { data } });
    await flushPromises();
    const next = { nodes: [{ id: 'b', label: 'B', file_type: 'repo' }], links: [] };
    await w.setProps({ data: next });
    expect(instance.setData).toHaveBeenCalledWith(next);
  });

  it('reacts to `filters` prop changes via setFilters', async () => {
    const w = mount(ShipGraph, { props: { data } });
    await flushPromises();
    await w.setProps({ filters: ['imports'] });
    expect(instance.setFilters).toHaveBeenCalledWith(['imports']);
    await w.setProps({ filters: null });
    expect(instance.setFilters).toHaveBeenLastCalledWith(null);
  });

  it('reacts to `focus` prop changes via focus', async () => {
    const w = mount(ShipGraph, { props: { data } });
    await flushPromises();
    await w.setProps({ focus: 'a' });
    expect(instance.focus).toHaveBeenCalledWith('a');
  });

  it('reacts to `reducedMotion` and `draggable` prop changes', async () => {
    const w = mount(ShipGraph, { props: { data } });
    await flushPromises();
    await w.setProps({ reducedMotion: true });
    expect(instance.setReducedMotion).toHaveBeenCalledWith(true);
    await w.setProps({ draggable: false });
    expect(instance.setDraggable).toHaveBeenCalledWith(false);
  });

  it('emits node/hover/focus from core node events', async () => {
    const w = mount(ShipGraph, { props: { data } });
    await flushPromises();
    handlers.get('click')?.('a');
    handlers.get('hover')?.('a');
    handlers.get('hover')?.(null);
    handlers.get('focus')?.('a');
    expect(w.emitted('node')?.[0]).toEqual(['a']);
    expect(w.emitted('hover')?.[0]).toEqual(['a']);
    expect(w.emitted('hover')?.[1]).toEqual([null]);
    expect(w.emitted('focus')?.[0]).toEqual(['a']);
  });

  it('emits link from a core linkclick event', async () => {
    const w = mount(ShipGraph, { props: { data } });
    await flushPromises();
    const link: GraphLink = { source: 'a', target: 'b', relation: 'references', weight: 0.5 };
    handlers.get('linkclick')?.(link);
    expect(w.emitted('link')?.[0]).toEqual([link]);
  });

  it('emits ready with the core instance', async () => {
    const w = mount(ShipGraph, { props: { data } });
    await flushPromises();
    expect(w.emitted('ready')?.[0]).toEqual([instance]);
  });

  it('destroys the core instance and unsubscribes on unmount', async () => {
    const w = mount(ShipGraph, { props: { data } });
    await flushPromises();
    expect(handlers.size).toBe(4);
    w.unmount();
    expect(instance.destroy).toHaveBeenCalledTimes(1);
    expect(handlers.size).toBe(0);
  });
});

describe('<ShipGraph> parity: edge filters + community focus', () => {
  it('applies hiddenRelations on mount and reconciles on change', async () => {
    const w = mount(ShipGraph, { props: { data, hiddenRelations: ['references'] } });
    await flushPromises();
    // Mount: want {references}, have {} -> hide references.
    expect(instance.toggleRelation).toHaveBeenCalledWith('references', false);

    // Now the core reports references as hidden; switching to a different set
    // must show references again and hide the new one.
    instance.getHiddenRelations.mockReturnValue(['references']);
    await w.setProps({ hiddenRelations: ['similar_to'] });
    expect(instance.toggleRelation).toHaveBeenCalledWith('references', true);
    expect(instance.toggleRelation).toHaveBeenCalledWith('similar_to', false);
  });

  it('reacts to focusCommunity prop changes', async () => {
    const w = mount(ShipGraph, { props: { data, focusCommunity: 1 } });
    await flushPromises();
    expect(instance.focusCommunity).toHaveBeenCalledWith(1);
    await w.setProps({ focusCommunity: null });
    expect(instance.focusCommunity).toHaveBeenLastCalledWith(null);
  });

  it('exposes imperative toggleRelation/focusCommunity/focusNode', async () => {
    const w = mount(ShipGraph, { props: { data } });
    await flushPromises();
    const exposed = w.vm as unknown as {
      toggleRelation: (r: string, v?: boolean) => void;
      focusCommunity: (c: number | null) => void;
      focusNode: (id: string) => void;
    };
    exposed.toggleRelation('references', false);
    exposed.focusCommunity(2);
    exposed.focusNode('a');
    expect(instance.toggleRelation).toHaveBeenCalledWith('references', false);
    expect(instance.focusCommunity).toHaveBeenCalledWith(2);
    expect(instance.focus).toHaveBeenCalledWith('a');
  });
});

describe('<ShipGraph> deep link (?focus=)', () => {
  const setSearch = (search: string) => {
    window.history.replaceState({}, '', search ? `/?${search}` : '/');
  };

  beforeEach(() => setSearch(''));

  it('focuses the node named by ?focus= on mount (client-only)', async () => {
    setSearch('focus=b');
    mount(ShipGraph, { props: { data } });
    await flushPromises();
    expect(instance.focus).toHaveBeenCalledWith('b');
  });

  it('honors a custom deepLinkParam', async () => {
    setSearch('node=c');
    mount(ShipGraph, { props: { data, deepLinkParam: 'node' } });
    await flushPromises();
    expect(instance.focus).toHaveBeenCalledWith('c');
  });

  it('no-ops when the query param is absent', async () => {
    mount(ShipGraph, { props: { data } });
    await flushPromises();
    expect(instance.focus).not.toHaveBeenCalled();
  });

  it('is disabled by deepLink=false', async () => {
    setSearch('focus=b');
    mount(ShipGraph, { props: { data, deepLink: false } });
    await flushPromises();
    expect(instance.focus).not.toHaveBeenCalled();
  });

  it('an explicit focus prop wins over the deep link', async () => {
    setSearch('focus=b');
    mount(ShipGraph, { props: { data, focus: 'a' } });
    await flushPromises();
    expect(instance.focus).toHaveBeenCalledWith('a');
    expect(instance.focus).not.toHaveBeenCalledWith('b');
  });
});

describe('<ShipGraph> accessibility (keyboard + SR list)', () => {
  const a11yData = {
    nodes: [
      { id: 'a', label: 'Alpha' },
      { id: 'b', label: 'Bravo' },
      { id: 'c', label: 'Charlie' },
    ],
    links: [],
  };

  it('renders one accessible list entry per node', async () => {
    const w = mount(ShipGraph, { props: { data: a11yData } });
    await flushPromises();
    const items = w.findAll('.shipgraph-node-list li');
    expect(items).toHaveLength(3);
    expect(items.map((li) => li.text())).toEqual(['Alpha', 'Bravo', 'Charlie']);
  });

  it('wires keyboard traversal: ArrowDown focuses the next node', async () => {
    const w = mount(ShipGraph, { props: { data: a11yData } });
    await flushPromises();
    const region = w.find('.shipgraph');
    // Region is keyboard-focusable and marked as an application widget.
    expect(region.attributes('tabindex')).toBe('0');
    expect(region.attributes('role')).toBe('application');
    await region.trigger('keydown', { key: 'ArrowDown' });
    expect(instance.focus).toHaveBeenCalledWith('a');
    await region.trigger('keydown', { key: 'ArrowDown' });
    expect(instance.focus).toHaveBeenLastCalledWith('b');
    await region.trigger('keydown', { key: 'ArrowUp' });
    expect(instance.focus).toHaveBeenLastCalledWith('a');
  });

  it('activating a list entry focuses that node', async () => {
    const w = mount(ShipGraph, { props: { data: a11yData } });
    await flushPromises();
    await w.findAll('.shipgraph-node-list button')[2].trigger('click');
    expect(instance.focus).toHaveBeenCalledWith('c');
  });
});
