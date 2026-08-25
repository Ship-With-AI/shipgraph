// <ShipGraph> — an idiomatic React component over @shipgraph/core. It renders a
// mount point for the core, drives it through the useShipGraph hook (lifecycle,
// prop reactivity, event callbacks), and layers the parity features: edge-type
// filters, community focus, `?focus=` deep links, and a keyboard/screen-reader
// accessible fallback list of every node.
//
// SSR safety: this component renders only the container + accessible list on the
// server; the core (and its Canvas 2D engine) is loaded client-side inside the
// hook's effect, so it can never crash during SSR/hydration.
import { useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import type { GraphNode, RawNode } from '@shipgraph/core';
import { useShipGraph } from './useShipGraph';
import type { UseShipGraphOptions, UseShipGraphResult } from './useShipGraph';

export interface ShipGraphProps extends UseShipGraphOptions {
  /** Accessible label for the graph region. */
  ariaLabel?: string;
  /** Extra class on the root element. */
  className?: string;
  /** Extra style on the root element. */
  style?: CSSProperties;
}

// Visually hidden but available to assistive tech and keyboard focus (the
// classic .sr-only recipe), shipped inline so no CSS import is required.
const SR_ONLY: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
};
const ROOT_STYLE: CSSProperties = { position: 'relative', width: '100%', height: '100%', minHeight: 240 };
const GRAPH_STYLE: CSSProperties = { width: '100%', height: '100%', minHeight: 240 };

export function ShipGraph(props: ShipGraphProps): JSX.Element {
  const { ariaLabel = 'Interactive graph visualization', className, style, ...hookOpts } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const { focusNode }: UseShipGraphResult = useShipGraph(containerRef, hookOpts);

  // Accessible fallback, derived straight from the data prop (engine-agnostic):
  // one keyboard/SR-navigable entry per node, working even before/without a
  // rendered canvas (SSR hydration or a screen-reader-only user).
  const nodeList = useMemo(
    () =>
      ((props.data?.nodes ?? []) as Array<GraphNode | RawNode>).map((n) => ({
        id: n.id,
        label: n.label ?? n.id,
      })),
    [props.data],
  );

  const [activeIndex, setActiveIndex] = useState(-1);
  // Mirror of activeIndex for the keydown handler, which needs the current value
  // synchronously without depending on a fresh render.
  const activeRef = useRef(-1);

  function focusIndex(i: number): void {
    if (i < 0 || i >= nodeList.length) return;
    activeRef.current = i;
    setActiveIndex(i);
    focusNode(nodeList[i].id);
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>): void {
    const n = nodeList.length;
    if (!n) return;
    const cur = activeRef.current;
    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        e.preventDefault();
        focusIndex((cur + 1 + n) % n);
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
        e.preventDefault();
        focusIndex((cur - 1 + n) % n);
        break;
      case 'Home':
        e.preventDefault();
        focusIndex(0);
        break;
      case 'End':
        e.preventDefault();
        focusIndex(n - 1);
        break;
      case 'Enter':
      case ' ':
        if (cur >= 0) {
          e.preventDefault();
          focusIndex(cur);
        }
        break;
      default:
        break;
    }
  }

  const activeAnnouncement =
    activeIndex >= 0 && activeIndex < nodeList.length ? `Focused ${nodeList[activeIndex].label}` : '';

  return (
    <div className={className ? `shipgraph-root ${className}` : 'shipgraph-root'} style={{ ...ROOT_STYLE, ...style }}>
      <div
        ref={containerRef}
        className="shipgraph"
        style={GRAPH_STYLE}
        tabIndex={0}
        role="application"
        aria-label={ariaLabel}
        aria-describedby="shipgraph-sr-help"
        aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight Home End Enter"
        onKeyDown={onKeyDown}
      />
      {/* Screen-reader + keyboard fallback: one accessible entry per node. */}
      <p id="shipgraph-sr-help" style={SR_ONLY}>
        Interactive graph. Use arrow keys to move between {nodeList.length} nodes and Enter to focus one.
      </p>
      <ul className="shipgraph-node-list" style={SR_ONLY} aria-label="Graph nodes">
        {nodeList.map((n, i) => (
          <li key={n.id}>
            <button
              type="button"
              aria-current={i === activeIndex ? 'true' : undefined}
              onClick={() => focusIndex(i)}
            >
              {n.label}
            </button>
          </li>
        ))}
      </ul>
      <p style={SR_ONLY} aria-live="polite">
        {activeAnnouncement}
      </p>
    </div>
  );
}

export default ShipGraph;
