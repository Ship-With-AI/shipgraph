// @shipgraph/core demo — exercises the PUBLIC API (createGraph + feel
// primitives) on StackMap's real graph.json, and exposes window.__demo so the
// headless perf harness can drive it. Nothing here touches the engine directly.
import { createGraph } from '../src/index';
import type { RawGraph, ShipGraph } from '../src/index';

const el = document.getElementById('graph') as HTMLElement;
const $ = (id: string) => document.getElementById(id) as HTMLElement;

const raw = (await fetch('/graph.json').then((r) => r.json())) as RawGraph;

// Synthesize an ~Nx RAW graph by cloning the real topology into shifted copies
// with a handful of bridge links — flows through the adapter like real data.
function scaleUp(base: RawGraph, factor: number): RawGraph {
  if (factor <= 1) return base;
  const nodes: RawGraph['nodes'] = [];
  const links: RawGraph['links'] = [];
  for (let k = 0; k < factor; k++) {
    for (const n of base.nodes) {
      nodes.push({
        ...n,
        id: `${n.id}#${k}`,
        community: (Number(n.community) || 0) + k * 1000,
      });
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

// --- perf sampling via the public `frame` + `settle` events -----------------
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

const options = { backgroundColor: '#0b0f14', reducedMotion: false } as const;
const graph: ShipGraph = createGraph(el, undefined, options);

graph.on('frame', () => {
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
graph.on('settle', () => {
  perf.settled = true;
  $('settled').textContent = 'yes';
});

let currentScale = 1;
function load(factor: number) {
  currentScale = factor;
  perf.settled = false;
  $('settled').textContent = 'no';
  graph.setData(scaleUp(raw, factor));
  const data = graph.getData();
  $('nn').textContent = String(data.nodes.length);
  $('nl').textContent = String(data.links.length);
  $('scale').textContent = `${factor}x`;
  renderFilters();
  return data;
}

// --- relation filters (public setFilters/getRelations) ----------------------
const active = new Set<string>();
function renderFilters() {
  const rels = graph.getRelations();
  if (!active.size) for (const r of rels) active.add(r);
  $('filters').innerHTML =
    '<b style="color:#9db3c9">edge filters</b><br/>' +
    rels
      .map(
        (r) =>
          `<label><input type="checkbox" data-rel="${r}" ${active.has(r) ? 'checked' : ''}/> ${r}</label>`,
      )
      .join('');
  for (const cb of Array.from($('filters').querySelectorAll('input[data-rel]'))) {
    const input = cb as HTMLInputElement;
    input.onchange = () => {
      const rel = input.dataset.rel as string;
      if (input.checked) active.add(rel);
      else active.delete(rel);
      graph.setFilters(active.size === rels.length ? null : [...active]);
    };
  }
}

$('scale1').onclick = () => load(1);
$('scale5').onclick = () => load(5);
$('reheat').onclick = () => {
  perf.settled = false;
  $('settled').textContent = 'no';
  graph.reheat();
};
$('fit').onclick = () => graph.fit();
($('reduceMotion') as HTMLInputElement).onchange = (e) => {
  graph.setReducedMotion((e.target as HTMLInputElement).checked);
  perf.settled = false;
  $('settled').textContent = 'no';
};

setInterval(() => {
  $('fps').textContent = perf.fps.toFixed(1);
  const m = p95(perf.frames);
  $('ms').textContent = m.toFixed(1);
  $('ms').className = m > 32 ? 'bad' : '';
  $('fps').className = perf.fps < 30 && !perf.settled ? 'bad' : '';
}, 250);

// --- headless harness API (drives the public feel primitives) ---------------
const randomId = () => {
  const ids = graph.getData().nodes.map((n) => n.id);
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
  stats(): {
    scale: number;
    nodes: number;
    links: number;
    fps: number;
    frameMsP95: number;
    settled: boolean;
  };
  resetPerf(): void;
}

const api: DemoApi = {
  setScale: (f) => {
    const d = load(f);
    return { nodes: d.nodes.length, links: d.links.length };
  },
  reheat: () => graph.reheat(),
  settled: () => perf.settled,
  fit: () => graph.fit(600),
  hoverRandom: () => graph.hoverHalo(randomId()),
  focusRandom: () => graph.focus(randomId()),
  collapseRandom: () => graph.collapse(randomId()),
  setReducedMotion: (on) => graph.setReducedMotion(on),
  setFilters: (rels) => graph.setFilters(rels),
  stats: () => {
    const d = graph.getData();
    return {
      scale: currentScale,
      nodes: d.nodes.length,
      links: d.links.length,
      fps: +perf.fps.toFixed(1),
      frameMsP95: +p95(perf.frames).toFixed(1),
      settled: perf.settled,
    };
  },
  resetPerf,
};
(window as unknown as { __demo: DemoApi }).__demo = api;

load(1);
// eslint-disable-next-line no-console
console.log('[demo] ready', api.stats());
