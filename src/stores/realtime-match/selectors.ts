import type { RealtimeState } from './types';

export const DRAFT_FALLBACK_SECONDS = 15;

export function selectDraftCountdownSeconds(
  state: { draft: { forceAtMs?: number | null } | null },
  nowMs = Date.now(),
): number {
  const deadlineAtMs = state.draft?.forceAtMs;
  if (typeof deadlineAtMs !== 'number' || !Number.isFinite(deadlineAtMs)) {
    return DRAFT_FALLBACK_SECONDS;
  }
  return Math.max(0, Math.ceil((deadlineAtMs - nowMs) / 1000));
}

export function selectHasResolvedRound(state: RealtimeState): boolean {
  if (!state.match) return false;
  if (state.match.lastRoundResult) return true;

  return Object.values(state.match.questions).some(
    (question) => question.selfIsCorrect !== undefined || question.opponentIsCorrect !== undefined,
  );
}
