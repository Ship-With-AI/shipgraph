// @shipgraph/vue demo — mounts the PUBLIC <ShipGraph> component on StackMap's
// real graph.json and exposes window.__demo so the headless perf harness can
// drive it. Feel-bar interactions that map to props (data scale, focus,
// filters) are driven by mutating reactive state — proving the component is
// reactive — while imperative primitives (hover halo, reheat, collapse, fit)
// go through the live core instance surfaced via @ready.
import { createApp, h, reactive, shallowRef } from 'vue';
import { ShipGraph } from '../src/index';
import type { GraphData, RawGraph, ShipGraphInstance } from '../src/index';

const raw = (await fetch('/graph.json').then((r) => r.json())) as RawGraph;

// Synthesize an ~Nx RAW graph by cloning topology into shifted copies with a
// few bridge links — flows through the adapter like real data.
function scaleUp(base: RawGraph, factor: number): RawGraph {
  if (factor <= 1) return base;
  const nodes: RawGraph['nodes'] = [];
  const links: RawGraph['links'] = [];
  for (let k = 0; k < factor; k++) {
    for (const n of base.nodes) {
      nodes.push({ ...n, id: `${n.id}#${k}`, community: (Number(n.community) || 0) + k * 1000 });
    }
    for (const l of base.links) {
      links.push({ ...l, source: `${l.source}#${k}`, target: `${l.target}#${k}` });
    }
    if (k > 0) {
      for (let b = 0; b < 20; b++) {
        const a = base.nodes[(b * 31) % base.nodes.length].id;
        links.push({ source: `${a}#${k - 1}`, target: `${a}#${k}`, relation: 'bridge', weight: 0.2 });
      }
    }
  }
  return { ...base, nodes, links };
}

// --- reactive props the harness mutates -------------------------------------
const state = reactive({
  data: raw as RawGraph | GraphData,
  filters: null as string[] | null,
  focus: null as string | null,
  reducedMotion: false,
  scale: 1,
});

const instance = shallowRef<ShipGraphInstance | null>(null);

// --- perf sampling via the core `frame` + `settle` events -------------------
const perf = { fps: 0, frames: [] as number[], last: performance.now(), settled: false };
function p95(arr: number[]): number {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(s.length * 0.95))];
}
function resetPerf() {
  perf.frames = [];
  perf.fps = 0;
  perf.last = performance.now();
}

function onReady(g: ShipGraphInstance) {
  instance.value = g;
  g.on('frame', () => {
    const now = performance.now();
    const dt = now - perf.last;
    perf.last = now;
    if (dt > 0 && dt < 1000) {
      const inst = 1000 / dt;
      perf.fps = perf.fps ? perf.fps * 0.9 + inst * 0.1 : inst;
      perf.frames.push(dt);
      if (perf.frames.length > 240) perf.frames.shift();
    }
  });
  g.on('settle', () => {
    perf.settled = true;
    const el = document.getElementById('settled');
    if (el) el.textContent = 'yes';
  });
}

// --- app: <ShipGraph> bound to reactive props + a small HUD ------------------
const Root = {
  setup() {
    return () =>
      h('div', { style: 'position:absolute;inset:0;' }, [
        h(ShipGraph, {
          data: state.data,
          filters: state.filters,
          focus: state.focus,
          reducedMotion: state.reducedMotion,
          style: 'position:absolute;inset:0;',
          onReady,
          // eslint-disable-next-line no-console
          onNode: (id: string) => console.log('[demo] node', id),
          // eslint-disable-next-line no-console
          onLink: (l: unknown) => console.log('[demo] link', l),
          onFocus: (id: string) => console.log('[demo] focus', id),
        }),
      ]);
  },
};
createApp(Root).mount('#app');

// HUD lives in index.html-independent DOM so the harness can read it too.
const hud = document.createElement('div');
hud.id = 'hud';
hud.className = 'panel';
hud.innerHTML =
  '<h1>@shipgraph/vue</h1>' +
  '<div class="row"><span>fps (ema)</span><b id="fps">–</b></div>' +
  '<div class="row"><span>frame ms (p95)</span><b id="ms">–</b></div>' +
  '<div class="row"><span>nodes</span><b id="nn">–</b></div>' +
  '<div class="row"><span>links</span><b id="nl">–</b></div>' +
  '<div class="row"><span>scale</span><b id="scale">1x</b></div>' +
  '<div class="row"><span>settled</span><b id="settled">no</b></div>';
document.body.appendChild(hud);
const $ = (id: string) => document.getElementById(id);
setInterval(() => {
  const set = (id: string, v: string) => {
    const el = $(id);
    if (el) el.textContent = v;
  };
  set('fps', perf.fps.toFixed(1));
  set('ms', p95(perf.frames).toFixed(1));
  const d = instance.value?.getData();
  if (d) {
    set('nn', String(d.nodes.length));
    set('nl', String(d.links.length));
  }
  set('scale', `${state.scale}x`);
}, 250);

// --- headless harness API (drives the PUBLIC component) ---------------------
const randomId = () => {
  const ids = instance.value?.getData().nodes.map((n) => n.id) ?? [];
  return ids[Math.floor(Math.random() * ids.length)];
};

interface DemoApi {
  setScale(f: number): { nodes: number; links: number };
  reheat(): void;
  settled(): boolean;
  fit(): void;
  hoverRandom(): void;
  focusRandom(): void;
  collapseRandom(): void;
  setReducedMotion(on: boolean): void;
  setFilters(rels: string[] | null): void;
  stats(): { scale: number; nodes: number; links: number; fps: number; frameMsP95: number; settled: boolean };
  resetPerf(): void;
}

const api: DemoApi = {
  // prop-driven: mutating reactive state flows through the component's watchers.
  setScale: (f) => {
    state.scale = f;
    state.filters = null;
    perf.settled = false;
    const s = $('settled');
    if (s) s.textContent = 'no';
    state.data = scaleUp(raw, f);
    const d = state.data;
    return { nodes: d.nodes.length, links: d.links.length };
  },
  focusRandom: () => {
    state.focus = randomId();
  },
  setFilters: (rels) => {
    state.filters = rels;
  },
  setReducedMotion: (on) => {
    state.reducedMotion = on;
  },
  // imperative primitives via the live instance.
  reheat: () => instance.value?.reheat(),
  settled: () => perf.settled,
  fit: () => instance.value?.fit(600),
  hoverRandom: () => instance.value?.hoverHalo(randomId()),
  collapseRandom: () => instance.value?.collapse(randomId()),
  stats: () => {
    const d = instance.value?.getData() ?? { nodes: [], links: [] };
    return {
      scale: state.scale,
      nodes: d.nodes.length,
      links: d.links.length,
      fps: +perf.fps.toFixed(1),
      frameMsP95: +p95(perf.frames).toFixed(1),
      settled: perf.settled,
    };
  },
  resetPerf,
};
// window has no typed __demo slot; attach the harness API for puppeteer to read.
const demoGlobal = window as unknown as { __demo: DemoApi };
demoGlobal.__demo = api;

// eslint-disable-next-line no-console
console.log('[demo] ready');
