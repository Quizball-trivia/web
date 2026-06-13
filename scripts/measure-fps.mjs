/* TEMP perf-bisect harness. Measures animation FPS of the landing hero in
 * system Chrome with CPU throttling (emulates a mid-range Android phone).
 * Usage: node scripts/measure-fps.mjs "<label>" "<url>"
 */
import { chromium } from 'playwright-core';

const [, , label = 'baseline', url = 'http://localhost:3001/en'] = process.argv;

const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: ['--headless=new', '--disable-gpu-vsync-thread'],
});
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  userAgent:
    'Mozilla/5.0 (Linux; Android 13; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Mobile Safari/537.36',
});
const page = await context.newPage();
const cdp = await context.newCDPSession(page);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });

await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
// Let the entrance animations + first sim phases settle into steady state.
await page.waitForTimeout(4000);

const result = await page.evaluate(
  () =>
    new Promise((resolve) => {
      const longTasks = [];
      try {
        new PerformanceObserver((list) => {
          for (const e of list.getEntries()) {
            longTasks.push({
              t: Math.round(e.startTime),
              d: Math.round(e.duration),
              name: e.name,
              attr: e.attribution?.[0]?.containerType ?? '',
            });
          }
        }).observe({ entryTypes: ['longtask'] });
      } catch {}
      const frames = [];
      let last = performance.now();
      const start = last;
      function tick(now) {
        frames.push(now - last);
        last = now;
        if (now - start < 10000) requestAnimationFrame(tick);
        else {
          frames.shift();
          const total = frames.reduce((a, b) => a + b, 0);
          const avg = total / frames.length;
          const sorted = [...frames].sort((a, b) => a - b);
          const p95 = sorted[Math.floor(sorted.length * 0.95)];
          const long = frames.filter((f) => f > 33.4).length; // dropped below 30fps
          const veryLong = frames.filter((f) => f > 66).length;
          resolve({
            frames: frames.length,
            avgMs: +avg.toFixed(2),
            fps: +(1000 / avg).toFixed(1),
            p95Ms: +p95.toFixed(1),
            longFrames: long,
            veryLongFrames: veryLong,
            longPct: +((long / frames.length) * 100).toFixed(1),
            longTasks,
          });
        }
      }
      requestAnimationFrame(tick);
    }),
);

console.log(JSON.stringify({ label, ...result }));
await browser.close();
