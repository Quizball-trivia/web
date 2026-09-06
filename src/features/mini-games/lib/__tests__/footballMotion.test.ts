import { describe, expect, it } from 'vitest';
import { netBallHeight } from '../footballMotion';

describe('scored ball settling', () => {
  it.each([0.56, 1.84, 1.9])('drops a %sm shot to the turf and stays there', height => {
    expect(netBallHeight(height, 0)).toBe(height);
    expect(netBallHeight(height, 0.4)).toBeLessThan(height);
    for (let elapsed = 0; elapsed < 5; elapsed += 1 / 30) {
      expect(netBallHeight(height, elapsed)).toBeGreaterThanOrEqual(0.13);
    }
    expect(netBallHeight(height, 2)).toBe(0.13);
    expect(netBallHeight(height, 60)).toBe(0.13);
  });
  it('keeps a ground-level shot on the surface', () => {
    expect(netBallHeight(0.13, 0)).toBe(0.13);
    expect(netBallHeight(0.13, 0.5)).toBe(0.13);
  });
});
