/* TEMP: quantify paint/raster pressure per subsystem (counts + durations of
 * paint pipeline events over 8s — proxy for GPU/raster cost on weak phones). */
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const [, , label = 'baseline', url = 'http://localhost:3002/en'] = process.argv;
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--headless=new'] });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true });
const page = await context.newPage();
await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(4000);
await browser.startTracing(page, { path: '/tmp/raster-trace.json', categories: ['devtools.timeline', 'disabled-by-default-devtools.timeline'] });
await page.waitForTimeout(8000);
await browser.stopTracing();
await browser.close();

const events = JSON.parse(fs.readFileSync('/tmp/raster-trace.json', 'utf8')).traceEvents;
const interesting = ['Paint', 'RasterTask', 'PrePaint', 'Layerize', 'Commit', 'UpdateLayoutTree', 'Layout', 'ImageDecodeTask', 'Decode Image', 'GPUTask', 'CompositeLayers'];
const stats = {};
for (const e of events) {
  if (!interesting.includes(e.name)) continue;
  if (e.ph !== 'X' || !e.dur) continue;
  stats[e.name] = stats[e.name] ?? { n: 0, ms: 0 };
  stats[e.name].n += 1;
  stats[e.name].ms += e.dur / 1000;
}
const out = { label };
for (const k of interesting) if (stats[k]) out[k] = { n: stats[k].n, ms: +stats[k].ms.toFixed(0) };
console.log(JSON.stringify(out));
