import type { RealtimeState } from './types';

export const DRAFT_FALLBACK_SECONDS = 15;

export function selectDraftCountdownSeconds(
  state: { draft: { forceAtMs?: number | null; turnAnchorMs?: number | null } | null },
  nowMs = Date.now(),
): number {
  const explicit = state.draft?.forceAtMs;
  const anchor = state.draft?.turnAnchorMs;
  // Legacy payloads omit forceAtMs — anchor the fallback to the turn start so
  // the countdown actually ticks instead of pinning at the static fallback.
  const deadlineAtMs =
    typeof explicit === 'number' && Number.isFinite(explicit)
      ? explicit
      : typeof anchor === 'number' && Number.isFinite(anchor)
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
