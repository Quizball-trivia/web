/* TEMP perf-bisect: capture a devtools trace and summarize main-thread cost. */
import { chromium } from 'playwright-core';
import fs from 'node:fs';

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

await browser.startTracing(page, {
  path: '/tmp/landing-trace.json',
  categories: [
    'devtools.timeline',
    'disabled-by-default-devtools.timeline',
    'disabled-by-default-devtools.timeline.stack',
    'v8.execute',
  ],
});
await page.waitForTimeout(8000);
await browser.stopTracing();
await browser.close();

const trace = JSON.parse(fs.readFileSync('/tmp/landing-trace.json', 'utf8'));
const events = trace.traceEvents ?? trace;
const byName = new Map();
const fnTime = new Map();
for (const e of events) {
  if (e.ph !== 'X' || !e.dur) continue;
  byName.set(e.name, (byName.get(e.name) ?? 0) + e.dur);
  if ((e.name === 'FunctionCall' || e.name === 'TimerFire' || e.name === 'FireAnimationFrame') && e.args?.data) {
    const d = e.args.data;
    const key = `${e.name}: ${d.functionName ?? d.timerId ?? ''} ${d.url ? d.url.split('/').pop()?.slice(0, 60) : ''}`;
    fnTime.set(key, (fnTime.get(key) ?? 0) + e.dur);
  }
}
const top = (m, n) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n)
  .map(([k, v]) => `${(v / 1000).toFixed(0).padStart(6)}ms  ${k}`).join('\n');
console.log('=== top event types (total self+children dur over 8s) ===');
console.log(top(byName, 15));
console.log('=== top function/timer attributions ===');
console.log(top(fnTime, 12));
