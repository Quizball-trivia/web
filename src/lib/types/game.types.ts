/**
 * Shared game types used across multiple features (party, game, possession, etc.)
 * These types are domain-level game state and should not be feature-specific.
 */

export type AnswerState = 'default' | 'correct' | 'wrong' | 'disabled';
export type AnswerStateArray = [AnswerState, AnswerState, AnswerState, AnswerState];

export type Phase =
  | 'intro'
  | 'pregame'
  | 'question-reveal'
  | 'playing'
  | 'reveal'
  | 'possession-move'
  | 'shot'
  | 'shot-result'
  | 'goal'
  | 'saved'
  | 'halftime'
  | 'fulltime'
  | 'penalty-transition'
  | 'penalty-question'
  | 'penalty-playing'
  | 'penalty-reveal'
  | 'penalty-result'
  | 'transitioning';

// Constants
export const QUESTION_REVEAL_MS = 3000;
export const QUESTIONS_PER_HALF = 6;
export const TIMER_SECONDS = 10;
export const ANSWER_LABELS = ['A', 'B', 'C', 'D'] as const;
