// Headless perf harness for the @shipgraph/vue demo. Drives window.__demo (which
// drives the PUBLIC <ShipGraph> component — scale/focus/filters via reactive
// props, hover/reheat/collapse/fit via the live instance) at 1x and 5x,
// sampling render fps/frame-time during the active physics phase and after
// settle. Writes perf-results.json + screenshots.
// Reproducible: `node demo/perf.mjs` with the demo dev server running.
import puppeteer from 'puppeteer';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const URL = process.env.DEMO_URL || 'http://localhost:5191/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-gl=swiftshader', '--enable-webgl'],
  defaultViewport: { width: 1440, height: 900 },
});
const page = await browser.newPage();
page.on('console', (m) => { if (m.type() === 'error') console.log('[page-error]', m.text()); });
await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
await page.waitForFunction('window.__demo && window.__demo.stats().nodes > 0', { timeout: 30000 });

async function sample(seconds) {
  await page.evaluate(() => window.__demo.resetPerf());
  await sleep(seconds * 1000);
  return page.evaluate(() => window.__demo.stats());
}

async function measure(scale) {
  const sz = await page.evaluate((s) => window.__demo.setScale(s), scale);
  await sleep(400); // let the component's data watcher flush setData
  await page.evaluate(() => window.__demo.reheat());
  await sleep(300);
  const active = await sample(3);
  // interaction under load: hover halos + eased focus camera (prop-driven)
  await page.evaluate(() => { for (let i = 0; i < 5; i++) window.__demo.hoverRandom(); });
  await page.evaluate(() => window.__demo.focusRandom());
  const interact = await sample(2);
  // wait for settle, then steady-state fps while continuously interacting
  const t0 = Date.now();
  while (!(await page.evaluate(() => window.__demo.settled())) && Date.now() - t0 < 20000) await sleep(250);
  const settleMs = Date.now() - t0;
  await page.evaluate(() => window.__demo.resetPerf());
  const iv = await page.evaluateHandle(() => setInterval(() => {
    window.__demo.hoverRandom();
    if (Math.random() < 0.2) window.__demo.focusRandom();
  }, 60));
  await sleep(2500);
  const settledInteract = await page.evaluate(() => window.__demo.stats());
  await page.evaluate((h) => clearInterval(h), iv);
  await page.screenshot({ path: join(HERE, `perf-${scale}x.png`) });
  return { scale, nodes: sz.nodes, links: sz.links, settleMs, active, interact, settledInteract };
}

const results = { component: '@shipgraph/vue <ShipGraph>', url: URL, chrome: await browser.version(), at: new Date().toISOString(), runs: [] };
for (const s of [1, 5]) {
  const r = await measure(s);
  results.runs.push(r);
  console.log(`\n=== ${s}x  (${r.nodes} nodes / ${r.links} links) ===`);
  console.log(`  active-sim         fps ${r.active.fps.toFixed(1)}  frameP95 ${r.active.frameMsP95}ms`);
  console.log(`  interacting        fps ${r.interact.fps.toFixed(1)}  frameP95 ${r.interact.frameMsP95}ms`);
  console.log(`  settled+interact   fps ${r.settledInteract.fps.toFixed(1)}  frameP95 ${r.settledInteract.frameMsP95}ms  (settle ${(r.settleMs / 1000).toFixed(1)}s)`);
}
// sanity: exercise filters (prop) + collapse (instance) once so the harness proves they run
await page.evaluate(() => { window.__demo.setFilters(['references']); window.__demo.setFilters(null); window.__demo.collapseRandom(); });
writeFileSync(join(HERE, 'perf-results.json'), JSON.stringify(results, null, 2));
console.log('\nwrote demo/perf-results.json, demo/perf-1x.png, demo/perf-5x.png');
await browser.close();
