export type { TacticalCard } from '@/lib/realtime/socket.types';

import type { Phase, AnswerState, AnswerStateArray } from '@/lib/types/game.types';

// ─── Shared game types (re-exported for backward compatibility) ─
export type { Phase, AnswerState, AnswerStateArray };
export { QUESTION_REVEAL_MS, QUESTIONS_PER_HALF, TIMER_SECONDS, ANSWER_LABELS } from '@/lib/types/game.types';

// ─── State shapes ───────────────────────────────────────────────
export interface PossessionState {
  position: number; // 0–100
  momentum: number; // 0–6
  goals: number;
  isShooting: boolean;
}

export type ShotResult = 'pending' | 'goal' | 'saved' | 'miss';
export type FeedDirection = 'forward' | 'backward' | 'neutral';
export type PenaltyResult = 'pending' | 'goal' | 'saved' | null;
export type PenaltyFieldPhase = 'setup' | 'playing' | 'result';

export interface TacticModifiers {
  correctVsWrongGain: number;
  wrongVsCorrectPenalty: number;
  speedBonusMultiplier: number;
  shotMomentumThreshold: number;
}

// ─── Constants ──────────────────────────────────────────────────
export const PENALTY_TIMER = 5;
export const MAX_PENALTY_ROUNDS = 5;
export const BALL_ANIM_MS = 900;

export const DEFAULT_ANSWER_STATES: AnswerStateArray = ['default', 'default', 'default', 'default'];

export const INITIAL_POSSESSION: PossessionState = {
  position: 50,
  momentum: 0,
  goals: 0,
  isShooting: false,
};
