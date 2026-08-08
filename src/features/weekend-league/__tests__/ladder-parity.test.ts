import { describe, expect, it } from 'vitest';
import { FINALISTS, wlLadder } from '../gauntlet/gauntlet.data';

/**
 * The frontend ladder MIRRORS the backend's wlBuildLadder (wl-rules.ts). This
 * file re-implements the backend rule independently: if either side is edited
 * without the other, these assertions fail instead of players being shown cut
 * numbers the server will not honour.
 */
function backendLadder(fieldSize: number): [number, number, number] {
  const n = Math.max(0, Math.floor(fieldSize));
  if (n <= 3) return [n, n, n];
  const finalTarget = Math.min(24, n - 3);
  const ratio = Math.pow(finalTarget / n, 1 / 3);
  const a1 = Math.min(n - 1, Math.max(finalTarget + 2, Math.round(n / 3), Math.round(n * ratio)));
  const a2 = Math.min(a1 - 1, Math.max(finalTarget + 1, Math.round(n / 6), Math.round(n * ratio * ratio)));
  return [a1, a2, finalTarget];
}

describe('WL ladder parity with the backend', () => {
  it('uses the same finalist count as the backend (WL_FINALISTS)', () => {
    expect(FINALISTS).toBe(24);
  });

  it('produces identical targets for every field size up to 2000', () => {
    for (let n = 0; n <= 2000; n += 1) {
      expect(wlLadder(n)).toEqual(backendLadder(n));
    }
  });

  it('cuts in every game and ends at 24 once the field allows it', () => {
    for (let n = 4; n <= 2000; n += 1) {
      const [a1, a2, a3] = wlLadder(n);
      expect(a1).toBeLessThan(n);
      expect(a2).toBeLessThan(a1);
      expect(a3).toBeLessThan(a2);
      if (n >= 27) expect(a3).toBe(24);
    }
  });

  it('is monotonic — one extra entrant never swings a cut', () => {
    for (let n = 5; n <= 2000; n += 1) {
      const prev = wlLadder(n - 1);
      const cur = wlLadder(n);
      expect(cur[0]).toBeGreaterThanOrEqual(prev[0]);
      expect(cur[1]).toBeGreaterThanOrEqual(prev[1]);
    }
  });
});
