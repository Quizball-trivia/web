import type { TacticalCard } from '../components/HalftimeScreen';

// ─── Phase state machine ────────────────────────────────────────
export type Phase =
  | 'intro'
  | 'pregame'
  | 'question-reveal'
  | 'playing'
  | 'reveal'
  | 'possession-move'
  | 'shot'
  | 'goal'
  | 'saved'
  | 'halftime'
  | 'fulltime'
  | 'penalty-transition'
  | 'penalty-question'
  | 'penalty-playing'
  | 'penalty-reveal'
  | 'penalty-result';

// ─── State shapes ───────────────────────────────────────────────
export interface PossessionState {
  position: number; // 0–100
  momentum: number; // 0–6
  goals: number;
  isShooting: boolean;
}

export type AnswerState = 'default' | 'correct' | 'wrong' | 'disabled';
export type AnswerStateArray = [AnswerState, AnswerState, AnswerState, AnswerState];

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
export const QUESTION_REVEAL_MS = 2000;
export const QUESTIONS_PER_HALF = 6;
export const TIMER_SECONDS = 10;
export const PENALTY_TIMER = 5;
export const MAX_PENALTY_ROUNDS = 5;
export const BALL_ANIM_MS = 900;
export const ANSWER_LABELS = ['A', 'B', 'C', 'D'] as const;

export const DEFAULT_ANSWER_STATES: AnswerStateArray = ['default', 'default', 'default', 'default'];

export const INITIAL_POSSESSION: PossessionState = {
  position: 50,
  momentum: 0,
  goals: 0,
  isShooting: false,
};

// ─── Re-exports for convenience ─────────────────────────────────
export type { TacticalCard };
