import type { RealtimeState } from './types';

export function selectHasResolvedRound(state: RealtimeState): boolean {
  if (!state.match) return false;
  if (state.match.lastRoundResult) return true;

  return Object.values(state.match.questions).some(
    (question) => question.selfIsCorrect !== undefined || question.opponentIsCorrect !== undefined,
  );
}
