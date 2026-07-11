import type { RealtimeState } from './types';

export const DRAFT_FALLBACK_SECONDS = 15;

export function selectDraftCountdownSeconds(
  state: { draft: { forceAtMs?: number | null; turnAnchorMs?: number | null } | null },
  nowMs = Date.now(),
): number {
  const serverDeadline = state.draft?.forceAtMs;
  if (typeof serverDeadline === 'number' && Number.isFinite(serverDeadline)) {
    // The server budgets 16s to tolerate transport/render latency while the UI
    // intentionally presents a 15..0 clock.
    return Math.max(0, Math.ceil((serverDeadline - nowMs) / 1000) - 1);
  }
  const anchor = state.draft?.turnAnchorMs;
  // Compatibility fallback for older servers which did not include the turn
  // deadline. New servers are authoritative through forceAtMs.
  const deadlineAtMs = typeof anchor === 'number' && Number.isFinite(anchor)
    ? anchor + DRAFT_FALLBACK_SECONDS * 1000
    : null;
  if (deadlineAtMs === null) return DRAFT_FALLBACK_SECONDS;
  return Math.max(0, Math.ceil((deadlineAtMs - nowMs) / 1000));
}

export function selectHasResolvedRound(state: RealtimeState): boolean {
  if (!state.match) return false;
  if (state.match.lastRoundResult) return true;

  return Object.values(state.match.questions).some(
    (question) => question.selfIsCorrect !== undefined || question.opponentIsCorrect !== undefined,
  );
}
