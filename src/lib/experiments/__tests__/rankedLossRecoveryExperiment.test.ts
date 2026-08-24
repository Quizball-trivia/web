import { describe, expect, it } from 'vitest';
import { getRankedLossRecoveryCue } from '../rankedLossRecoveryExperiment';

const eligible = {
  matchType: 'ranked' as const,
  playerWon: false,
  isDraw: false,
  isCancelledNoContest: false,
  isPlacementMatch: false,
  oldRp: 500,
  newRp: 482,
};

describe('getRankedLossRecoveryCue', () => {
  it('uses the authoritative settlement delta instead of a guessed RP target', () => {
    expect(getRankedLossRecoveryCue(eligible)).toEqual({
      previousRp: 500,
      currentRp: 482,
      rpToRecover: 18,
    });
  });

  it.each([
    { playerWon: true },
    { isDraw: true },
    { isCancelledNoContest: true },
    { isPlacementMatch: true },
    { matchType: 'friendly' as const },
    { newRp: 500 },
  ])('does not enroll ineligible results: %o', (override) => {
    expect(getRankedLossRecoveryCue({ ...eligible, ...override })).toBeNull();
  });
});
