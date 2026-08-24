// Headless perf harness for the shipgraph feel-bar spike.
// Drives window.__spike at 1x and 5x, samples FPS/frame-time while the physics
// simulation runs and after it settles, exercises hover halo + focus camera,
// and writes perf-results.json + screenshots. Reproducible: `node perf.mjs`.
import puppeteer from 'puppeteer';
import { writeFileSync } from 'node:fs';

const URL = process.env.SPIKE_URL || 'http://localhost:5188/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-gl=swiftshader', '--enable-webgl'],
  defaultViewport: { width: 1440, height: 900 },
});
const page = await browser.newPage();
page.on('console', (m) => { if (m.type() === 'error') console.log('[page-error]', m.text()); });
await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
await page.waitForFunction('window.__spike && window.__spike.stats().nodes > 0', { timeout: 30000 });

async function sample(seconds) {
  await page.evaluate(() => window.__spike.resetPerf());
  await sleep(seconds * 1000);
  return page.evaluate(() => window.__spike.stats());
}

async function measure(scale) {
  const sz = await page.evaluate((s) => window.__spike.setScale(s), scale);
  // active-simulation window (physics heating — worst case for fps)
  await page.evaluate(() => window.__spike.reheat());
  await sleep(300);
  const active = await sample(3);
  // interaction under load: hover halos + focus camera easing
  await page.evaluate(() => { for (let i = 0; i < 5; i++) window.__spike.hoverRandom(); });
  await page.evaluate(() => window.__spike.focusRandom());
  const interact = await sample(2);
  // wait for settle, then steady-state fps
  const t0 = Date.now();
  while (!(await page.evaluate(() => window.__spike.settled())) && Date.now() - t0 < 20000) await sleep(250);
  const settleMs = Date.now() - t0;
  // at rest force-graph pauses its render loop (0% idle CPU). Measure fps while
  // continuously interacting (hover halos + focus camera) to prove interactive
  // smoothness on a settled graph.
  await page.evaluate(() => window.__spike.resetPerf());
  const iv = await page.evaluateHandle(() => setInterval(() => { window.__spike.hoverRandom(); if (Math.random() < 0.2) window.__spike.focusRandom(); }, 60));
  await sleep(2500);
  const settledInteract = await page.evaluate(() => window.__spike.stats());
  await page.evaluate((h) => clearInterval(h), iv);
  await page.screenshot({ path: `perf-${scale}x.png` });
  return { scale, nodes: sz.nodes, links: sz.links, settleMs, active, interact, settledInteract };
}

const results = { url: URL, chrome: await browser.version(), at: new Date().toISOString(), runs: [] };
for (const s of [1, 5]) {
  const r = await measure(s);
  results.runs.push(r);
  console.log(`\n=== ${s}x  (${r.nodes} nodes / ${r.links} links) ===`);
  console.log(`  active-sim         fps ${r.active.fps.toFixed(1)}  frameP95 ${r.active.frameMsP95}ms`);
  console.log(`  interacting        fps ${r.interact.fps.toFixed(1)}  frameP95 ${r.interact.frameMsP95}ms`);
  console.log(`  settled+interact   fps ${r.settledInteract.fps.toFixed(1)}  frameP95 ${r.settledInteract.frameMsP95}ms  (settle ${(r.settleMs / 1000).toFixed(1)}s)`);
}
writeFileSync('perf-results.json', JSON.stringify(results, null, 2));
console.log('\nwrote perf-results.json, perf-1x.png, perf-5x.png');
await browser.close();
