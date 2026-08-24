// shipgraph spike — force-graph "feel bar" on StackMap's real graph.json
// Demonstrates: physics elasticity, hover 1-hop neighborhood halo, eased
// click-to-focus camera, spring-back node drag, reduced-motion path.
// Exposes window.__spike for the headless perf harness.
import ForceGraph from 'force-graph';

const el = document.getElementById('graph');
const $ = (id) => document.getElementById(id);

// ---- data load + adapt to force-graph shape --------------------------------
const raw = await fetch('/graph.json').then((r) => r.json());

// Community palette (deterministic hue per community id).
const hue = (c) => `hsl(${(Number(c) * 47) % 360} 68% 62%)`;

function adapt(src) {
  const nodes = src.nodes.map((n) => ({
    id: n.id,
    label: n.label,
    type: n.file_type,
    community: n.community,
    communityName: n.community_name,
    deg: 0,
  }));
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const links = [];
  for (const l of src.links) {
    if (!byId.has(l.source) || !byId.has(l.target)) continue;
    links.push({ source: l.source, target: l.target, rel: l.relation, weight: l.weight ?? 0.5 });
    byId.get(l.source).deg++;
    byId.get(l.target).deg++;
  }
  return { nodes, links };
}

// Synthesize an ~Nx graph by cloning the real topology into shifted copies
// with a few inter-copy bridge links. Keeps degree distribution realistic.
function scaleUp(base, factor) {
  if (factor <= 1) return adapt(base);
  const nodes = [];
  const links = [];
  for (let k = 0; k < factor; k++) {
    for (const n of base.nodes) {
      nodes.push({
        id: `${n.id}#${k}`,
        label: n.label,
        type: n.file_type,
        community: Number(n.community) + k * 1000,
        communityName: n.community_name,
        deg: 0,
      });
    }
    for (const l of base.links) {
      links.push({ source: `${l.source}#${k}`, target: `${l.target}#${k}`, rel: l.relation, weight: l.weight ?? 0.5 });
    }
    if (k > 0) {
      // a handful of bridges so copies don't fly apart into isolated islands
      for (let b = 0; b < 20; b++) {
        const a = base.nodes[(b * 31) % base.nodes.length].id;
        links.push({ source: `${a}#${k - 1}`, target: `${a}#${k}`, rel: 'bridge', weight: 0.2 });
      }
    }
  }
  const byId = new Map(nodes.map((n) => [n.id, n]));
  for (const l of links) { byId.get(l.source).deg++; byId.get(l.target).deg++; }
  return { nodes, links };
}

// ---- adjacency (1-hop neighborhood for hover halo) -------------------------
let adj = new Map();
function buildAdj(data) {
  adj = new Map();
  const add = (a, b) => { (adj.get(a) ?? adj.set(a, new Set()).get(a)).add(b); };
  for (const l of data.links) {
    const s = typeof l.source === 'object' ? l.source.id : l.source;
    const t = typeof l.target === 'object' ? l.target.id : l.target;
    add(s, t); add(t, s);
  }
}

// ---- graph instance --------------------------------------------------------
let hoverNode = null;
let hoverSet = new Set();
let reduceMotion = false;
const camMs = () => (reduceMotion ? 0 : 700); // eased focus duration

const g = ForceGraph()(el)
  .backgroundColor('#0b0f14')
  .nodeId('id')
  .nodeRelSize(4)
  .nodeVal((n) => 1 + Math.sqrt(n.deg))
  .nodeLabel((n) => `${n.label} · ${n.communityName ?? ''}`)
  .linkColor((l) => {
    if (hoverNode) {
      const s = typeof l.source === 'object' ? l.source.id : l.source;
      const t = typeof l.target === 'object' ? l.target.id : l.target;
      return hoverSet.has(s) && hoverSet.has(t) ? 'rgba(110,231,183,.9)' : 'rgba(120,140,160,.06)';
    }
    return 'rgba(120,140,160,.22)';
  })
  .linkWidth((l) => {
    if (!hoverNode) return 1;
    const s = typeof l.source === 'object' ? l.source.id : l.source;
    const t = typeof l.target === 'object' ? l.target.id : l.target;
    return hoverSet.has(s) && hoverSet.has(t) ? 2.5 : 0.5;
  })
  .nodeCanvasObjectMode(() => 'replace')
  .nodeCanvasObject((n, ctx, scale) => {
    const r = (1 + Math.sqrt(n.deg)) * 1.6;
    const dim = hoverNode && !hoverSet.has(n.id);
    // 1-hop halo: glow ring on hovered node + its neighbors
    if (hoverNode && hoverSet.has(n.id)) {
      ctx.beginPath();
      ctx.arc(n.x, n.y, r + 6, 0, 2 * Math.PI);
      ctx.fillStyle = n.id === hoverNode ? 'rgba(110,231,183,.28)' : 'rgba(110,231,183,.14)';
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(n.x, n.y, r, 0, 2 * Math.PI);
    ctx.fillStyle = dim ? 'rgba(90,105,120,.25)' : hue(n.community);
    ctx.fill();
    if (n.id === hoverNode) { ctx.lineWidth = 1.5 / scale; ctx.strokeStyle = '#eafff5'; ctx.stroke(); }
    // labels only when zoomed in enough and not dimmed
    if (scale > 2 && !dim) {
      ctx.font = `${11 / scale}px ui-sans-serif, sans-serif`;
      ctx.fillStyle = 'rgba(230,237,243,.85)';
      ctx.fillText(n.label, n.x + r + 2, n.y + 3 / scale);
    }
  })
  .onNodeHover((n) => {
    hoverNode = n ? n.id : null;
    hoverSet = new Set();
    if (n) { hoverSet.add(n.id); for (const m of adj.get(n.id) ?? []) hoverSet.add(m); }
    el.style.cursor = n ? 'pointer' : '';
  })
  .onNodeClick((n) => focusNode(n))
  // spring-back drag: pin while dragging, release on end so physics reels it in
  .onNodeDrag((n) => { n.fx = n.x; n.fy = n.y; })
  .onNodeDragEnd((n) => {
    if (reduceMotion) { n.fx = n.x; n.fy = n.y; return; } // no bounce when reduced
    n.fx = undefined; n.fy = undefined;
    g.d3ReheatSimulation();
  });

// elasticity tuning — springy links, firm repulsion (the "NVL bounce")
g.d3Force('charge').strength(-140).distanceMax(420);
g.d3Force('link').distance((l) => 30 + 40 * (1 - (l.weight ?? 0.5))).strength(0.5);

function focusNode(n) {
  if (!n) return;
  g.centerAt(n.x, n.y, camMs());
  g.zoom(reduceMotion ? g.zoom() : 4, camMs());
}

// ---- perf HUD + measurement ------------------------------------------------
const perf = { fps: 0, frames: [], last: performance.now(), settled: false };
window.__perf = perf;
g.onRenderFramePre(() => {
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
g.onEngineStop(() => { perf.settled = true; $('settled').textContent = 'yes'; });

function p95(arr) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(s.length * 0.95))];
}
setInterval(() => {
  $('fps').textContent = perf.fps.toFixed(1);
  const m = p95(perf.frames);
  $('ms').textContent = m.toFixed(1);
  $('ms').className = m > 32 ? 'bad' : '';
  if (perf.fps < 30 && !perf.settled) $('fps').className = 'bad'; else $('fps').className = '';
}, 250);

// ---- scale switching + legend ---------------------------------------------
let currentScale = 1;
function load(factor) {
  currentScale = factor;
  perf.settled = false;
  $('settled').textContent = 'no';
  const data = scaleUp(raw, factor);
  buildAdj(data);
  g.graphData(data);
  $('nn').textContent = data.nodes.length;
  $('nl').textContent = data.links.length;
  $('scale').textContent = `${factor}x`;
  renderLegend(raw);
  return data;
}
function renderLegend(base) {
  const names = new Map();
  for (const n of base.nodes) if (!names.has(n.community)) names.set(n.community, n.community_name);
  const top = [...names].slice(0, 8);
  $('legend').innerHTML = top
    .map(([c, name]) => `<span><i style="background:${hue(c)}"></i>${name ?? 'c' + c}</span>`)
    .join('');
}

$('scale1').onclick = () => load(1);
$('scale5').onclick = () => load(5);
$('reheat').onclick = () => g.d3ReheatSimulation();
$('reduceMotion').onchange = (e) => {
  reduceMotion = e.target.checked;
  // reduced motion: settle instantly, no camera easing, no drag bounce
  g.cooldownTicks(reduceMotion ? 0 : Infinity);
  g.d3ReheatSimulation();
};

// ---- headless harness API --------------------------------------------------
window.__spike = {
  setScale: (f) => { load(f); return { nodes: g.graphData().nodes.length, links: g.graphData().links.length }; },
  reheat: () => g.d3ReheatSimulation(),
  settled: () => perf.settled,
  // drive interactions programmatically so the harness can measure real feel
  fit: () => g.zoomToFit(600, 40),
  hoverRandom: () => {
    const ns = g.graphData().nodes;
    const n = ns[Math.floor(Math.random() * ns.length)];
    hoverNode = n.id; hoverSet = new Set([n.id, ...(adj.get(n.id) ?? [])]);
    return hoverSet.size;
  },
  focusRandom: () => {
    const ns = g.graphData().nodes;
    focusNode(ns[Math.floor(Math.random() * ns.length)]);
  },
  stats: () => ({
    scale: currentScale,
    nodes: g.graphData().nodes.length,
    links: g.graphData().links.length,
    fps: +perf.fps.toFixed(1),
    frameMsP95: +p95(perf.frames).toFixed(1),
    settled: perf.settled,
  }),
  resetPerf: () => { perf.frames = []; perf.fps = 0; perf.last = performance.now(); },
};

load(1);
console.log('[spike] ready', window.__spike.stats());
