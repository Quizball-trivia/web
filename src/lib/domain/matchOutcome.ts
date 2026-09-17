/**
 * Single source of truth for "did I win, lose, or draw this match?".
 *
 * Every surface that previously derived the answer from
 * `winnerUserId === selfUserId` (results screen, penalty match-end overlay,
 * history rows, streak cues) must go through here so that a null winner with
 * decision `'draw'` (ranked penalty shootouts that end level) renders as a
 * draw everywhere and never as a loss.
 */
export type MatchOutcome = 'win' | 'loss' | 'draw' | 'cancelled';

export function resolveMatchOutcome(input: {
  /** Authoritative winner. `null` = nobody won; `undefined` = not known yet. */
  winnerUserId: string | null | undefined;
  selfUserId: string;
  winnerDecisionMethod?: string | null;
  /** Explicit draw flag from the completion payload (draws are also `winnerUserId: null`). */
  isDraw?: boolean | null;
  cancelledNoContest?: boolean;
  /** Score fallback, used only when no authoritative winner is known. */
  playerScore?: number;
  opponentScore?: number;
}): MatchOutcome {
  if (input.cancelledNoContest === true) return 'cancelled';
  if (input.isDraw === true) return 'draw';

  if (input.winnerUserId === undefined) {
    const mine = input.playerScore ?? 0;
    const theirs = input.opponentScore ?? 0;
    if (mine > theirs) return 'win';
    if (mine < theirs) return 'loss';
    return 'draw';
  }

  // A null winner is a draw regardless of the decision method (covers the new
  // `'draw'` decision and keeps the pre-existing null handling for others).
  if (input.winnerUserId === null) return 'draw';
  return input.winnerUserId === input.selfUserId ? 'win' : 'loss';
}
