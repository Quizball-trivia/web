import { describe, expect, it } from 'vitest';
import { gridWinLine } from '../winLine';

const claims = (a: number[], b: number[]) => [
  ...a.map((cellIndex) => ({ cellIndex, owner: 'a' })),
  ...b.map((cellIndex) => ({ cellIndex, owner: 'b' })),
];

describe('gridWinLine', () => {
  it('finds the row, column or diagonal the winner holds', () => {
    expect(gridWinLine(claims([3, 4, 5], [0, 8]), 'a')).toEqual([3, 4, 5]);
    expect(gridWinLine(claims([0, 1], [2, 5, 8]), 'b')).toEqual([2, 5, 8]);
    expect(gridWinLine(claims([2, 4, 6, 0], [1, 3]), 'a')).toEqual([2, 4, 6]);
  });

  it('is null for a win without a line, a draw, or a line that belongs to the other player', () => {
    expect(gridWinLine(claims([0, 1, 5, 6, 8], [2, 3, 4, 7]), 'a')).toBeNull();
    expect(gridWinLine(claims([0, 1, 2], [3, 4]), null)).toBeNull();
    expect(gridWinLine(claims([0, 1, 2], [3, 4]), 'b')).toBeNull();
  });
});
