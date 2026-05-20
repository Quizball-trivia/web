import { describe, expect, it } from 'vitest';
import { calculateCluesDisplayPoints } from '../cluesScoring';

describe('calculateCluesDisplayPoints', () => {
  it('starts at 100 and loses 20 points per revealed clue', () => {
    expect(calculateCluesDisplayPoints(1)).toBe(100);
    expect(calculateCluesDisplayPoints(2)).toBe(80);
    expect(calculateCluesDisplayPoints(3)).toBe(60);
    expect(calculateCluesDisplayPoints(4)).toBe(40);
    expect(calculateCluesDisplayPoints(5)).toBe(20);
  });

  it('does not drop below 20 for late clue counts', () => {
    expect(calculateCluesDisplayPoints(6)).toBe(20);
    expect(calculateCluesDisplayPoints(10)).toBe(20);
  });
});
