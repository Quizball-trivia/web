---
name: verify
description: Build, launch and drive the Quizball web app in a browser to observe a change actually working. Use when verifying frontend changes end-to-end.
---

# Verifying the Quizball web app

## Launch

A `next dev` instance is often already running — **check before starting one**,
because Next holds a lock at `.next/dev/lock` and a second instance dies with
"Unable to acquire lock".

```bash
for p in 3000 3001 3002; do echo "$p -> $(curl -s -o /dev/null -w '%{http_code}' http://localhost:$p/ --max-time 5)"; done
```

`308` on `/` means it's up (it redirects). If nothing responds:
`npx next dev -p 3000`. First compile of a route takes 30–60s — use generous
curl/Playwright timeouts, and hit the route once with curl to warm it before
driving.

## Browser

No Playwright browsers are cached, but **system Chrome works** with
`playwright-core`:

```js
import { chromium } from 'playwright-core';
const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
});
```

Install `playwright-core` in the scratchpad, not the repo.

## Two gotchas that will waste a run

1. **Locale defaults to Georgian.** Text assertions in English silently miss.
   Pin it before navigating to the target route:
   ```js
   await page.goto('http://localhost:3000/');
   await page.evaluate(() => localStorage.setItem('quizball_locale', JSON.stringify('en')));
   ```
2. **React Query devtools inject visible buttons.** `page.locator('button:visible')`
   picks them up, and `.first()` usually *is* one of them. Always target by role
   + name (`getByRole('button', { name: /start auction/i })`), and filter the
   devtools chrome out of any button inventory:
   ```js
   .filter((b) => !/TANSTACK|React Query|Sort by|^Asc$|^Desc$|^\d+$/i.test(b))
   ```

CSP blocks an inline script on every page load — that console error is ambient,
not caused by your change.

## Auction flow

- `/auction` is **live mode**: needs backend + auth. Not drivable standalone.
- `/dev/auction` is a harness of isolated phase scenarios (hand-built mock
  state). Good for a specific phase's UI, useless for sequencing/timing.
- To drive the **real** end-to-end sequence with no backend, add a temp route
  mounting the flow in mock mode (`/dev/*` bypasses auth in dev), then delete it:
  ```tsx
  <AuctionFlowScreen username="V" avatarSeed="avatar-1" avatarCustomization={null} mode="mock" />
  ```
  The flow parks on a Formation screen behind a **START AUCTION** button — click
  it or nothing advances.

Turn order is randomised: the human may not open a lot, so poll for `YOUR TURN`
rather than assuming the first bid is yours. A full lot runs ~15s before bidding
(intro → clues → study window), and round 2 starts ~27s in — size polling
windows accordingly or you'll conclude a later round "never happened".

## Don't

Running `vitest` / `tsc` is not verification here — they prove CI works, not that
the app does. Drive the browser.
