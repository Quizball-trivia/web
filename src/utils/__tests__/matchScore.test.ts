import { describe, expect, it } from 'vitest';

import { formatMatchScore } from '../matchScore';

const baseMatch = {
  status: 'completed' as const,
  playerGoals: 1,
  opponentGoals: 0,
  playerPenaltyGoals: 0,
  opponentPenaltyGoals: 0,
  winnerDecisionMethod: 'goals' as const,
};

describe('formatMatchScore', () => {
  it('uses localized cancelled badge key for abandoned matches', () => {
    expect(formatMatchScore({ ...baseMatch, status: 'abandoned' })).toEqual({
      score: '1-0',
      suffix: null,
      badge: null,
      badgeI18nKey: 'recentMatches.cancelled',
      badgeVariant: 'muted',
    });
  });

  it('keeps forfeit rows as compact FF badges', () => {
    expect(formatMatchScore({ ...baseMatch, winnerDecisionMethod: 'forfeit' })).toMatchObject({
      score: '1-0',
      badge: 'FF',
      badgeI18nKey: null,
      badgeVariant: 'red',
    });
  });

  it('keeps penalty score suffixes', () => {
    expect(formatMatchScore({
      ...baseMatch,
      playerGoals: 2,
      opponentGoals: 2,
      playerPenaltyGoals: 4,
      opponentPenaltyGoals: 3,
      winnerDecisionMethod: 'penalty_goals',
    })).toMatchObject({
      score: '2-2',
      suffix: '(P 4-3)',
      badge: null,
      badgeI18nKey: null,
    });
  });
});
