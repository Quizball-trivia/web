import { describe, expect, it } from 'vitest';
import { answerPoints, nextShooter, resolveKick, shootoutWinner, type Kick } from '../zoneMatch.shootout';

const kick = (shooter: Kick['shooter'], result: Kick['result']): Kick => ({ shooter, result, points: { player: 0, opponent: 0 } });

describe('penalty shootout', () => {
  it('scores answers like Ranked 1.0: 10 per second left, nothing when wrong', () => {
    expect(answerPoints(false, 1000, 12_000)).toBe(0);
    expect(answerPoints(true, 0, 12_000)).toBe(120);
    expect(answerPoints(true, 4_200, 12_000)).toBe(90);
    expect(answerPoints(true, null, 12_000)).toBe(0);
  });

  it('decides a kick: faster right shooter scores, level points saved, both wrong missed', () => {
    expect(resolveKick('player', { player: 90, opponent: 0 }).result).toBe('goal');
    expect(resolveKick('player', { player: 90, opponent: 80 }).result).toBe('goal');
    expect(resolveKick('player', { player: 80, opponent: 90 }).result).toBe('saved');
    expect(resolveKick('player', { player: 80, opponent: 80 }).result).toBe('saved');
    expect(resolveKick('player', { player: 0, opponent: 0 }).result).toBe('missed');
  });

  it('alternates shooters from the opener', () => {
    expect(nextShooter([], 'opponent')).toBe('opponent');
    expect(nextShooter([kick('opponent', 'goal')], 'opponent')).toBe('player');
  });

  it('ends regulation early once one side cannot catch up', () => {
    // 3–0 after three kicks each: the trailing side has only two left.
    const kicks: Kick[] = [];
    for (let i = 0; i < 3; i += 1) kicks.push(kick('player', 'goal'), kick('opponent', 'saved'));
    expect(shootoutWinner(kicks, 'player')).toBe('player');
    expect(shootoutWinner(kicks.slice(0, 5), 'player')).toBe(null);
  });

  it('goes to sudden death when level after five each, decided by an unequal pair', () => {
    const kicks: Kick[] = [];
    for (let i = 0; i < 5; i += 1) kicks.push(kick('player', 'goal'), kick('opponent', 'goal'));
    expect(shootoutWinner(kicks, 'player')).toBe(null);
    kicks.push(kick('player', 'goal'));
    expect(shootoutWinner(kicks, 'player')).toBe(null);
    kicks.push(kick('opponent', 'saved'));
    expect(shootoutWinner(kicks, 'player')).toBe('player');
  });
});
