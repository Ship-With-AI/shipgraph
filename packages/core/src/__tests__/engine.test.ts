// @vitest-environment jsdom
// The concrete force-graph engine, exercised over jsdom. jsdom has no layout
// (every box measures 0) and no canvas backend, so these cover the DOM contract
// only: what the engine does to the elements it is handed. Rendering and real
// measurement are covered by the puppeteer perf harness and by consumers.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ForceGraphEngine } from '../engine/forceGraphEngine';

// jsdom ships no canvas backend, so getContext() returns null and force-graph
// dies on init. A permissive no-op context lets the engine mount so the DOM
// contract below is testable; nothing here asserts on pixels.
const noopContext = new Proxy(
  {},
  {
    get: (_t, prop) => {
      if (prop === 'canvas') return undefined;
      if (prop === 'measureText') return () => ({ width: 0 });
      if (prop === 'getImageData') return () => ({ data: new Uint8ClampedArray(4) });
      return () => undefined;
    },
    set: () => true,
  },
);

let originalGetContext: typeof HTMLCanvasElement.prototype.getContext;

beforeAll(() => {
  originalGetContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = (() =>
    noopContext) as unknown as typeof HTMLCanvasElement.prototype.getContext;
});

afterAll(() => {
  HTMLCanvasElement.prototype.getContext = originalGetContext;
});

function mounted(): { container: HTMLElement; engine: ForceGraphEngine } {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const engine = new ForceGraphEngine();
  engine.mount(container);
  return { container, engine };
}

describe('ForceGraphEngine layout containment', () => {
  it('takes the canvas wrapper out of flow so it cannot size its own container', () => {
    // Regression: force-graph writes an explicit px width on the <canvas>. In
    // flow that becomes the min-content contribution of every ancestor, so a
    // `1fr` grid track inflates to fit it, the engine measures the inflated box
    // and writes a wider canvas — a loop that walks the graph off the page.
    const { container } = mounted();
    const wrapper = container.firstElementChild as HTMLElement;

    expect(wrapper).toBeTruthy();
    expect(wrapper.style.position).toBe('absolute');
    expect(wrapper.style.inset).toBe('0');
  });

  it('makes the mount element a containing block for the absolute wrapper', () => {
    const { container } = mounted();
    expect(container.style.position).toBe('relative');
  });

  it('leaves an already-positioned mount element alone', () => {
    const container = document.createElement('div');
    container.style.position = 'absolute';
    document.body.appendChild(container);

    new ForceGraphEngine().mount(container);

    expect(container.style.position).toBe('absolute');
  });

  it('survives a container with no layout box (jsdom measures 0)', () => {
    // syncSize must treat a zero box as "not laid out yet" and leave the
    // current size alone rather than collapsing the canvas to nothing.
    expect(() => mounted()).not.toThrow();
  });

  it('disconnects the resize observer on destroy', () => {
    const seen: string[] = [];
    class FakeRO {
      observe(): void {
        seen.push('observe');
      }
      disconnect(): void {
        seen.push('disconnect');
      }
      unobserve(): void {}
    }
    const original = globalThis.ResizeObserver;
    globalThis.ResizeObserver = FakeRO as unknown as typeof ResizeObserver;
    try {
      const { engine } = mounted();
      expect(seen).toContain('observe');
      engine.destroy();
      expect(seen).toContain('disconnect');
    } finally {
      globalThis.ResizeObserver = original;
    }
  });
});
