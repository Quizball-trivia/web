/* TEMP perf-bisect: CPU-profile the landing page, name the hot JS frames. */
import { chromium } from 'playwright-core';

const [, , url = 'http://localhost:3001/en?nofx=sim,all'] = process.argv;

const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--headless=new'] });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
});
const page = await context.newPage();
const cdp = await context.newCDPSession(page);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });
await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(4000);

await cdp.send('Profiler.enable');
await cdp.send('Profiler.setSamplingInterval', { interval: 500 });
await cdp.send('Profiler.start');
await page.waitForTimeout(8000);
const { profile } = await cdp.send('Profiler.stop');
await browser.close();

// Sum self time per function node.
const hitCount = new Map();
const nodeById = new Map(profile.nodes.map((n) => [n.id, n]));
for (const n of profile.nodes) {
  if (n.hitCount) {
    const f = n.callFrame;
    const url = (f.url || '').split('/').pop()?.slice(0, 70) || '';
    const key = `${f.functionName || '(anon)'} — ${url}:${f.lineNumber}`;
    hitCount.set(key, (hitCount.get(key) ?? 0) + n.hitCount);
  }
}
const totalHits = [...hitCount.values()].reduce((a, b) => a + b, 0);
const top = [...hitCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25);
console.log(`total samples: ${totalHits} over 8s`);
for (const [k, v] of top) {
  console.log(`${((v / totalHits) * 100).toFixed(1).padStart(5)}%  ${k}`);
}
