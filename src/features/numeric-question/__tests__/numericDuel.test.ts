import { describe, expect, it, vi } from 'vitest';
import { decideNumericDuel, type DuelGuess, type DuelSide } from '../numericDuel';

const guess = (value: number | null, lockedAtMs: number | null = value === null ? null : 1000): DuelGuess => ({ value, lockedAtMs });
const neverFlip = () => {
  throw new Error('coin flip should not be needed');
};

describe('decideNumericDuel', () => {
  it('gives the pick to the closer guess, from either side of the answer', () => {
    const outcome = decideNumericDuel(65842, 0, { player: guess(64000), opponent: guess(70000) }, neverFlip);
    expect(outcome).toEqual({ winner: 'player', reason: 'closer', diffs: { player: 1842, opponent: 4158 } });
  });

  it('breaks an equal distance with the earlier lock-in', () => {
    const outcome = decideNumericDuel(20, 0, { player: guess(18, 5000), opponent: guess(22, 4000) }, neverFlip);
    expect(outcome.winner).toBe('opponent');
    expect(outcome.reason).toBe('faster');
  });

  it('gives the pick to the only player who answered, however far off', () => {
    const outcome = decideNumericDuel(20, 0, { player: guess(null), opponent: guess(900) }, neverFlip);
    expect(outcome).toEqual({ winner: 'opponent', reason: 'onlyAnswer', diffs: { player: null, opponent: 880 } });
  });

  it('flips a coin when nobody answered', () => {
    const flip = vi.fn((): DuelSide => 'player');
    const outcome = decideNumericDuel(20, 0, { player: guess(null), opponent: guess(null) }, flip);
    expect(flip).toHaveBeenCalledOnce();
    expect(outcome.reason).toBe('coinFlip');
  });

  it('flips a coin on an equal distance locked in at the same instant', () => {
    const outcome = decideNumericDuel(20, 0, { player: guess(19, 3000), opponent: guess(21, 3000) }, () => 'opponent');
    expect(outcome).toMatchObject({ winner: 'opponent', reason: 'coinFlip' });
  });

  it('compares decimals in whole units so float noise never decides it', () => {
    // 0.1 + 0.2 style noise: both are exactly 0.3 away once rounded to one decimal.
    const outcome = decideNumericDuel(85.5, 1, { player: guess(85.2, 2000), opponent: guess(85.8, 1000) }, neverFlip);
    expect(outcome.reason).toBe('faster');
    expect(outcome.winner).toBe('opponent');
    expect(outcome.diffs).toEqual({ player: 0.3, opponent: 0.3 });
  });
});
