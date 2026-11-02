import { describe, expect, it } from 'vitest';
import { skyScale } from '../ZoneMatchSkyShot';

describe('sky shot scale', () => {
  it('counts small numbers up from zero, with room over the highest guess', () => {
    const scale = skyScale({ answer: 22, guesses: { player: 18, opponent: 30 } }, 0);
    expect(scale.bottom).toBe(0);
    expect(scale.top).toBeGreaterThan(30);
    expect(scale.step).toBeGreaterThan(0);
  });

  it('starts big numbers well under the lowest value, so both balls climb', () => {
    const scale = skyScale({ answer: 72_000, guesses: { player: 72_000, opponent: 94_100 } }, 0);
    expect(scale.bottom).toBeLessThan(72_000 - 20_000);
    expect(scale.top).toBeGreaterThan(94_100);
  });

  it('copes with one side not answering and with everything equal', () => {
    const missing = skyScale({ answer: 5, guesses: { player: 5, opponent: null } }, 0);
    expect(missing.top).toBeGreaterThan(5);
    const same = skyScale({ answer: 1998, guesses: { player: 1998, opponent: 1998 } }, 0);
    expect(same.top).toBeGreaterThan(same.bottom);
    expect(Number.isFinite(same.step)).toBe(true);
  });
});
