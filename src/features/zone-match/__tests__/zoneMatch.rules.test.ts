import { describe, expect, it } from 'vitest';
import { mirrorZone, pitchColumn, pitchLabel, resolveBattle, type Possession } from '../zoneMatch.rules';

const playerAt = (zone: Possession['zone']): Possession => ({ attacker: 'player', zone });

describe('resolveBattle', () => {
  it('moves a winning attacker forward one zone, keeping the round going', () => {
    expect(resolveBattle(playerAt('own'), 'player')).toEqual({ kind: 'advance', next: playerAt('centre'), roundOver: false });
    expect(resolveBattle(playerAt('centre'), 'player')).toEqual({ kind: 'advance', next: playerAt('opponent'), roundOver: false });
  });

  it('scores from the opponent side and gives the conceding side the ball in the centre', () => {
    expect(resolveBattle(playerAt('opponent'), 'player')).toEqual({
      kind: 'goal',
      scorer: 'player',
      next: { attacker: 'opponent', zone: 'centre' },
      roundOver: true,
    });
  });

  // Ball in the defender's half = the attacker is in 'opponent'; in the attacker's half = 'own'.
  it('hands a both-wrong ball over exactly where it was lost', () => {
    const lost = (zone: Possession['zone']) => resolveBattle(playerAt(zone), null);
    expect(lost('opponent')).toEqual({ kind: 'bothWrong', next: { attacker: 'opponent', zone: 'own' }, roundOver: true });
    expect(lost('centre')).toMatchObject({ next: { attacker: 'opponent', zone: 'centre' } });
    expect(lost('own')).toMatchObject({ next: { attacker: 'opponent', zone: 'opponent' } });
  });

  it('carries a clean steal one zone forward from where it was won', () => {
    const stolen = (zone: Possession['zone']) => resolveBattle(playerAt(zone), 'opponent', { cleanSteal: true });
    // Won in the defender's own half → they attack from the centre.
    expect(stolen('opponent')).toEqual({ kind: 'turnover', next: { attacker: 'opponent', zone: 'centre' }, roundOver: true });
    // Won at the centre → they attack from the other side's half.
    expect(stolen('centre')).toMatchObject({ kind: 'turnover', next: { attacker: 'opponent', zone: 'opponent' } });
  });

  it('scores a clean steal won near the attacker’s own goal, and the scorer attacks next from the centre (turns alternate)', () => {
    expect(resolveBattle(playerAt('own'), 'opponent', { cleanSteal: true })).toEqual({
      kind: 'goal',
      scorer: 'opponent',
      stolen: true,
      next: { attacker: 'opponent', zone: 'centre' },
      roundOver: true,
    });
  });

  it('changes the turn on the same spot when the defender wins any other way (tiebreak, Gloves)', () => {
    const won = (zone: Possession['zone']) => resolveBattle(playerAt(zone), 'opponent');
    expect(won('opponent')).toEqual({ kind: 'turnover', next: { attacker: 'opponent', zone: 'own' }, roundOver: true });
    expect(won('centre')).toMatchObject({ next: { attacker: 'opponent', zone: 'centre' } });
    expect(won('own')).toMatchObject({ kind: 'turnover', next: { attacker: 'opponent', zone: 'opponent' } });
  });

  it('lets cards add zones (scoring past the other side) and set a floor', () => {
    expect(resolveBattle(playerAt('centre'), 'opponent', { cleanSteal: true, defenderSteps: 1 })).toMatchObject({ kind: 'goal', scorer: 'opponent', stolen: true });
    expect(resolveBattle(playerAt('centre'), 'opponent', { defenderSteps: 1 })).toMatchObject({ next: { attacker: 'opponent', zone: 'opponent' } });
    expect(resolveBattle(playerAt('opponent'), 'opponent', { defenderZone: 'opponent' })).toMatchObject({ next: { attacker: 'opponent', zone: 'opponent' } });
  });
});

describe('mirrorZone and pitchLabel', () => {
  it("flips a zone to the other side's view and names it from the player's seat", () => {
    expect(mirrorZone('own')).toBe('opponent');
    expect(mirrorZone('centre')).toBe('centre');
    expect(pitchLabel({ attacker: 'opponent', zone: 'opponent' })).toBe('your side');
    expect(pitchLabel({ attacker: 'player', zone: 'opponent' })).toBe('their side');
  });
});

describe('pitchColumn', () => {
  it('draws the player attacking left to right and the opponent right to left', () => {
    expect(pitchColumn({ attacker: 'player', zone: 'own' })).toBe(0);
    expect(pitchColumn({ attacker: 'player', zone: 'opponent' })).toBe(2);
    expect(pitchColumn({ attacker: 'opponent', zone: 'own' })).toBe(2);
    expect(pitchColumn({ attacker: 'opponent', zone: 'opponent' })).toBe(0);
    expect(pitchColumn({ attacker: 'opponent', zone: 'centre' })).toBe(1);
  });
});
