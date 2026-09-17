import { describe, expect, it } from 'vitest';
import { resolveMatchOutcome } from '../matchOutcome';

const SELF = 'user-self';
const OPP = 'user-opp';

describe('resolveMatchOutcome', () => {
  it('renders a null winner with decision "draw" as a draw (penalty-shootout draw)', () => {
    expect(resolveMatchOutcome({ winnerUserId: null, selfUserId: SELF, winnerDecisionMethod: 'draw' })).toBe('draw');
    expect(resolveMatchOutcome({ winnerUserId: null, selfUserId: SELF, winnerDecisionMethod: 'draw', isDraw: true })).toBe('draw');
  });

  it('honours an explicit isDraw flag from the completion payload', () => {
    expect(resolveMatchOutcome({ winnerUserId: null, selfUserId: SELF, isDraw: true })).toBe('draw');
  });

  it('keeps the existing behaviour for a null winner with decision "forfeit"', () => {
    // A null winner was never rendered as a loss before draws existed; the
    // cancelled/no-contest flag is what turns a forfeit into "Cancelled".
    expect(resolveMatchOutcome({ winnerUserId: null, selfUserId: SELF, winnerDecisionMethod: 'forfeit' })).toBe('draw');
    expect(
      resolveMatchOutcome({ winnerUserId: null, selfUserId: SELF, winnerDecisionMethod: 'forfeit', cancelledNoContest: true })
    ).toBe('cancelled');
  });

  it('resolves win and loss from the authoritative winner id', () => {
    expect(resolveMatchOutcome({ winnerUserId: SELF, selfUserId: SELF, winnerDecisionMethod: 'penalty_goals' })).toBe('win');
    expect(resolveMatchOutcome({ winnerUserId: OPP, selfUserId: SELF, winnerDecisionMethod: 'penalty_goals' })).toBe('loss');
    expect(resolveMatchOutcome({ winnerUserId: OPP, selfUserId: SELF, winnerDecisionMethod: 'forfeit' })).toBe('loss');
  });

  it('falls back to the score comparison when no authoritative winner is known', () => {
    expect(resolveMatchOutcome({ winnerUserId: undefined, selfUserId: SELF, playerScore: 3, opponentScore: 1 })).toBe('win');
    expect(resolveMatchOutcome({ winnerUserId: undefined, selfUserId: SELF, playerScore: 1, opponentScore: 3 })).toBe('loss');
    expect(resolveMatchOutcome({ winnerUserId: undefined, selfUserId: SELF, playerScore: 2, opponentScore: 2 })).toBe('draw');
  });

  it('cancelled no-contest wins over every other signal', () => {
    expect(resolveMatchOutcome({ winnerUserId: SELF, selfUserId: SELF, cancelledNoContest: true })).toBe('cancelled');
  });
});
