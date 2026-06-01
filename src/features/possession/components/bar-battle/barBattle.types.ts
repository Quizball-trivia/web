/**
 * Shared types for the BarBattle scene split.
 *
 * Re-exported through BarBattleOverlay.tsx so external consumers keep
 * importing `BarBattleState` from the original path.
 */

export type BarBattlePhase =
  | 'player-score'
  | 'opponent-score'
  | 'both-score'
  | 'convert'
  | 'bars'
  | 'battle'
  | 'charge'
  | 'result'
  | 'done';

export interface BarBattleState {
  key: number;
  phase: BarBattlePhase;
  playerBars: number;
  opponentBars: number;
  playerPoints: number;
  opponentPoints: number;
  remainingDelta: number;
  dividerX: number;
  /** `pulse` uses the charge glow without lunging the final bar into the avatar. */
  chargeMode?: 'lunge' | 'pulse';
  penaltyOutcome?: 'goal' | 'saved' | null;
}

export type BarBattleVariant = 'ranked_sim' | 'friendly_possession';
