import { describe, expect, it } from 'vitest';
import { resolveBattle, type Possession } from '../zoneMatch.rules';
import { GLOVES_SAVE_NOTE } from '../zoneMatch.machine';
import { describeOutcome, type ReasonInput } from '../zoneMatch.reason';

const at = (attacker: 'player' | 'opponent', zone: Possession['zone']): Possession => ({ attacker, zone });
/** The player answered `player`, the opponent `opponent` (0 is right). */
const answered = (player: boolean, opponent: boolean, patch: Partial<ReasonInput> = {}): ReasonInput => ({
  note: null,
  answers: { player: player ? 0 : 1, opponent: opponent ? 0 : 1, correct: 0 },
  tiebreak: false,
  results: [],
  ...patch,
});

describe('outcome reasons', () => {
  it('spells out a clean steal and its zone', () => {
    const from = at('opponent', 'centre');
    const r = describeOutcome(from, resolveBattle(from, 'player', { cleanSteal: true }), answered(true, false));
    expect(r.line).toBe('✓ vs ✗ — clean steal: +1 zone');
    expect(r.marks).toEqual({ player: 'right', opponent: 'wrong' });
    expect(r).toMatchObject({ kind: 'forward', fromColumn: 1, toColumn: 2, side: 'player', zones: 1 });
  });

  it('calls a steal near goal straight in', () => {
    const from = at('opponent', 'own');
    const r = describeOutcome(from, resolveBattle(from, 'player', { cleanSteal: true }), answered(true, false));
    expect(r.line).toBe('✓ vs ✗ — clean steal near goal: straight in!');
    expect(r).toMatchObject({ kind: 'goal', toColumn: 3 });
  });

  it('keeps the spot for a tiebreak win, both wrong and a Gloves save', () => {
    const from = at('opponent', 'centre');
    expect(describeOutcome(from, resolveBattle(from, 'player'), answered(true, true, { tiebreak: true })).line).toBe('Tiebreak won — turn over, same spot');
    expect(describeOutcome(from, resolveBattle(from, null), answered(false, false)).line).toBe('✗ vs ✗ — turn over, same spot');
    const shot = at('opponent', 'opponent');
    const saved = describeOutcome(shot, resolveBattle(shot, 'player'), { note: GLOVES_SAVE_NOTE, answers: null, tiebreak: false, results: [] });
    expect(saved.line).toBe('Goalkeeper Gloves — saved — turn over, same spot');
    expect(saved.marks).toEqual({ player: null, opponent: null });
  });

  it('follows the move of a Gloves save that breaks forward with Counter-Attack', () => {
    const shot = at('opponent', 'opponent');
    const outcome = resolveBattle(shot, 'player', { defenderSteps: 1 });
    const r = describeOutcome(shot, outcome, { note: GLOVES_SAVE_NOTE, answers: null, tiebreak: false, results: [{ card: 'goalkeeper-gloves', side: 'player' }, { card: 'counter-attack', side: 'player' }] });
    expect(r.line).toBe('Goalkeeper Gloves — saved: +1 zone (Counter-Attack +1)');
    expect(r).toMatchObject({ kind: 'forward', fromColumn: 0, toColumn: 1, side: 'player', zones: 1 });
  });

  it('names the cards that add zones, and the bus', () => {
    const from = at('player', 'own');
    const armband = describeOutcome(from, resolveBattle(from, 'player', { attackerSteps: 2 }), answered(true, false, { results: [{ card: 'captains-armband', side: 'player' }] }));
    expect(armband.line).toBe("✓ vs ✗ — +2 zones (Captain's Armband +1)");
    const held = describeOutcome(at('player', 'centre'), resolveBattle(at('player', 'centre'), 'player', { holdGround: true }), answered(true, false));
    expect(held.line).toBe('✓ vs ✗ — Park the Bus: no ground');
  });
});
