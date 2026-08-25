// Component tests for <ShipGraph>. The core is mocked so the binding contract
// (mount, prop reactivity, event relaying, teardown) is tested deterministically
// under jsdom — with no canvas/WebGL — exactly where SSR-unsafe code would blow
// up if it ran. Real-engine behavior is covered by the core/vue puppeteer paths.
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GraphLink } from '../src/index';

// A per-run registry of the event handlers the component subscribes on the core,
// so a test can fire a core event and assert the corresponding callback prop.
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

// Intercepts the component's dynamic `import('@shipgraph/core')`.
vi.mock('@shipgraph/core', () => ({ createGraph }));

// `vi.mock` is hoisted above this import by vitest, so the mock is in place.
import { ShipGraph } from '../src/index';

const data = { nodes: [{ id: 'a', label: 'A', file_type: 'doc' }], links: [] };

// Resolve once the core is created and its events are wired (the async dynamic
// import has settled).
async function ready(): Promise<void> {
  await waitFor(() => expect(createGraph).toHaveBeenCalled());
}

beforeEach(() => {
  vi.clearAllMocks();
  handlers.clear();
  window.history.replaceState({}, '', '/');
});

describe('<ShipGraph>', () => {
  it('mounts under jsdom without crashing and renders a container', async () => {
    render(<ShipGraph data={data} />);
    await ready();
    expect(document.querySelector('.shipgraph')).not.toBeNull();
    expect(createGraph).toHaveBeenCalledTimes(1);
    expect(createGraph.mock.calls[0][1]).toEqual(data);
  });

  it('applies initial filters and focus on mount when provided', async () => {
    render(<ShipGraph data={data} filters={['references']} focus="a" />);
    await ready();
    await waitFor(() => expect(instance.setFilters).toHaveBeenCalledWith(['references']));
    expect(instance.focus).toHaveBeenCalledWith('a');
  });

  it('reacts to `data` prop changes via setData', async () => {
    const { rerender } = render(<ShipGraph data={data} />);
    await ready();
    const next = { nodes: [{ id: 'b', label: 'B', file_type: 'repo' }], links: [] };
    rerender(<ShipGraph data={next} />);
    await waitFor(() => expect(instance.setData).toHaveBeenCalledWith(next));
  });

  it('reacts to `filters` prop changes via setFilters', async () => {
    const { rerender } = render(<ShipGraph data={data} />);
    await ready();
    rerender(<ShipGraph data={data} filters={['imports']} />);
    await waitFor(() => expect(instance.setFilters).toHaveBeenCalledWith(['imports']));
    rerender(<ShipGraph data={data} filters={null} />);
    await waitFor(() => expect(instance.setFilters).toHaveBeenLastCalledWith(null));
  });

  it('reacts to `focus` prop changes via focus', async () => {
    const { rerender } = render(<ShipGraph data={data} />);
    await ready();
    rerender(<ShipGraph data={data} focus="a" />);
    await waitFor(() => expect(instance.focus).toHaveBeenCalledWith('a'));
  });

  it('reacts to `reducedMotion` and `draggable` prop changes', async () => {
    const { rerender } = render(<ShipGraph data={data} />);
    await ready();
    rerender(<ShipGraph data={data} reducedMotion />);
    await waitFor(() => expect(instance.setReducedMotion).toHaveBeenCalledWith(true));
    rerender(<ShipGraph data={data} reducedMotion draggable={false} />);
    await waitFor(() => expect(instance.setDraggable).toHaveBeenCalledWith(false));
  });

  it('relays node/hover/focus core events to callbacks', async () => {
    const onNode = vi.fn();
    const onHover = vi.fn();
    const onFocus = vi.fn();
    render(<ShipGraph data={data} onNode={onNode} onHover={onHover} onFocus={onFocus} />);
    await ready();
    handlers.get('click')?.('a');
    handlers.get('hover')?.('a');
    handlers.get('hover')?.(null);
    handlers.get('focus')?.('a');
    expect(onNode).toHaveBeenCalledWith('a');
    expect(onHover).toHaveBeenNthCalledWith(1, 'a');
    expect(onHover).toHaveBeenNthCalledWith(2, null);
    expect(onFocus).toHaveBeenCalledWith('a');
  });

  it('relays a core linkclick event to onLink', async () => {
    const onLink = vi.fn();
    render(<ShipGraph data={data} onLink={onLink} />);
    await ready();
    const link: GraphLink = { source: 'a', target: 'b', relation: 'references', weight: 0.5 };
    handlers.get('linkclick')?.(link);
    expect(onLink).toHaveBeenCalledWith(link);
  });

  it('calls onReady with the core instance', async () => {
    const onReady = vi.fn();
    render(<ShipGraph data={data} onReady={onReady} />);
    await waitFor(() => expect(onReady).toHaveBeenCalledWith(instance));
  });

  it('destroys the core instance and unsubscribes on unmount', async () => {
    const { unmount } = render(<ShipGraph data={data} />);
    await ready();
    await waitFor(() => expect(handlers.size).toBe(4));
    unmount();
    expect(instance.destroy).toHaveBeenCalledTimes(1);
    expect(handlers.size).toBe(0);
  });
});

describe('<ShipGraph> parity: edge filters + community focus', () => {
  it('applies hiddenRelations on mount and reconciles on change', async () => {
    const { rerender } = render(<ShipGraph data={data} hiddenRelations={['references']} />);
    await ready();
    // Mount: want {references}, have {} -> hide references.
    await waitFor(() => expect(instance.toggleRelation).toHaveBeenCalledWith('references', false));

    // Now the core reports references as hidden; switching to a different set
    // must show references again and hide the new one.
    instance.getHiddenRelations.mockReturnValue(['references']);
    rerender(<ShipGraph data={data} hiddenRelations={['similar_to']} />);
    await waitFor(() => expect(instance.toggleRelation).toHaveBeenCalledWith('references', true));
    expect(instance.toggleRelation).toHaveBeenCalledWith('similar_to', false);
  });

  it('reacts to focusCommunity prop changes', async () => {
    const { rerender } = render(<ShipGraph data={data} focusCommunity={1} />);
    await ready();
    await waitFor(() => expect(instance.focusCommunity).toHaveBeenCalledWith(1));
    rerender(<ShipGraph data={data} focusCommunity={null} />);
    await waitFor(() => expect(instance.focusCommunity).toHaveBeenLastCalledWith(null));
  });
});

describe('<ShipGraph> deep link (?focus=)', () => {
  const setSearch = (search: string) => {
    window.history.replaceState({}, '', search ? `/?${search}` : '/');
  };

  it('focuses the node named by ?focus= on mount (client-only)', async () => {
    setSearch('focus=b');
    render(<ShipGraph data={data} />);
    await waitFor(() => expect(instance.focus).toHaveBeenCalledWith('b'));
  });

  it('honors a custom deepLinkParam', async () => {
    setSearch('node=c');
    render(<ShipGraph data={data} deepLinkParam="node" />);
    await waitFor(() => expect(instance.focus).toHaveBeenCalledWith('c'));
  });

  it('no-ops when the query param is absent', async () => {
    render(<ShipGraph data={data} />);
    await ready();
    expect(instance.focus).not.toHaveBeenCalled();
  });

  it('is disabled by deepLink={false}', async () => {
    setSearch('focus=b');
    render(<ShipGraph data={data} deepLink={false} />);
    await ready();
    expect(instance.focus).not.toHaveBeenCalled();
  });

  it('an explicit focus prop wins over the deep link', async () => {
    setSearch('focus=b');
    render(<ShipGraph data={data} focus="a" />);
    await waitFor(() => expect(instance.focus).toHaveBeenCalledWith('a'));
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
    render(<ShipGraph data={a11yData} />);
    await ready();
    const items = document.querySelectorAll('.shipgraph-node-list li');
    expect(items).toHaveLength(3);
    expect(Array.from(items).map((li) => li.textContent)).toEqual(['Alpha', 'Bravo', 'Charlie']);
  });

  it('wires keyboard traversal: ArrowDown focuses the next node', async () => {
    render(<ShipGraph data={a11yData} />);
    await ready();
    const region = document.querySelector('.shipgraph') as HTMLElement;
    // Region is keyboard-focusable and marked as an application widget.
    expect(region.getAttribute('tabindex')).toBe('0');
    expect(region.getAttribute('role')).toBe('application');
    fireEvent.keyDown(region, { key: 'ArrowDown' });
    expect(instance.focus).toHaveBeenCalledWith('a');
    fireEvent.keyDown(region, { key: 'ArrowDown' });
    expect(instance.focus).toHaveBeenLastCalledWith('b');
    fireEvent.keyDown(region, { key: 'ArrowUp' });
    expect(instance.focus).toHaveBeenLastCalledWith('a');
  });

  it('activating a list entry focuses that node', async () => {
    render(<ShipGraph data={a11yData} />);
    await ready();
    fireEvent.click(screen.getAllByRole('button')[2]);
    expect(instance.focus).toHaveBeenCalledWith('c');
  });
});
