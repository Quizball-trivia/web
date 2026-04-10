'use client';

import type { GameQuestion } from '@/lib/domain/gameQuestion';
import type { ResolvedMatchQuestionPayload } from '@/lib/realtime/socket.types';
import type { AnswerState, AnswerStateArray } from './types/possession.types';

export const TRANSITION_DELAY_MS = 1600;
export const FIELD_RESULT_COMPARE_MS = 900;
export const FIELD_POSSESSION_CUE_MS = 300;
export const QUESTION_PLAYING_MS = 10000;
export const OPTIMISTIC_SPLASH_SAFE_MARGIN_MS = 250;
export const HALFTIME_RESULTS_DELAY_MS = 4500;
export const PENALTY_COUNTDOWN_MS = 5000;
export const GOAL_CELEBRATION_MS = 7000;
export const DEV_GOAL_CELEBRATION_DELAY_MS = 800;
export const DEV_ATTACK_GOAL_HOLD_MS = 7500;
export const DEV_ATTACK_OTHER_HOLD_MS = 1500;
export const PENALTY_ICON_SWAP_DELAY_MS = 600;
export const FIRST_QUESTION_INTRO_MS = 2000;

export type FeedResult = 'goal' | 'saved' | 'miss' | null;
export type SplashVariant = 'pending' | 'points';

export interface TransitionSnapshot {
  title: string;
  categoryName: string | null;
  subtitle: string | null;
}

export interface GoalCelebrationState {
  scorerName: string;
  isMeScorer: boolean;
}

function toAnswerStateTuple(states: AnswerState[], optionsCount: number): AnswerStateArray {
  if (optionsCount !== 4 || states.length !== 4) {
    throw new Error(`Expected exactly 4 multiple-choice options, received ${optionsCount}`);
  }

  return [states[0], states[1], states[2], states[3]];
}

export function toAnswerStates(
  optionsCount: number,
  selectedAnswer: number | null,
  selfAnsweredCorrectly: boolean | null
): AnswerStateArray {
  if (selectedAnswer === null) {
    return toAnswerStateTuple(Array.from({ length: optionsCount }, () => 'default' as const), optionsCount);
  }

  if (selfAnsweredCorrectly === true) {
    return toAnswerStateTuple(Array.from({ length: optionsCount }, (_, index) => (
      index === selectedAnswer ? 'correct' : 'disabled'
    )), optionsCount);
  }

  if (selfAnsweredCorrectly === false) {
    return toAnswerStateTuple(Array.from({ length: optionsCount }, (_, index) => (
      index === selectedAnswer ? 'wrong' : 'disabled'
    )), optionsCount);
  }

  return toAnswerStateTuple(Array.from({ length: optionsCount }, (_, index) => (
    index === selectedAnswer ? 'default' : 'disabled'
  )), optionsCount);
}

export function toRevealAnswerStates(
  optionsCount: number,
  correctIndex: number | undefined,
  selectedAnswer: number | null
): AnswerStateArray {
  return toAnswerStateTuple(Array.from({ length: optionsCount }, (_, index) => {
    if (index === correctIndex) return 'correct';
    if (selectedAnswer === index) return 'wrong';
    return 'disabled';
  }), optionsCount);
}

export function createClientActionId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `cc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function getOptimisticSplashOutcome(params: {
  startedAtMs: number | null;
  deadlineAtMs: number | null;
}): { variant: SplashVariant; points: number | null } {
  const now = Date.now();
  const startedAt = params.startedAtMs ?? now;
  const maxWindowMs = params.deadlineAtMs != null
    ? Math.max(0, params.deadlineAtMs - startedAt)
    : QUESTION_PLAYING_MS;
  const effectiveNow = params.deadlineAtMs != null ? Math.min(now, params.deadlineAtMs) : now;
  const elapsedMs = Math.min(maxWindowMs, Math.max(0, effectiveNow - startedAt));
  const remainingMs = Math.max(0, maxWindowMs - elapsedMs);
  const points = remainingMs > 0 ? Math.ceil(remainingMs / 1000) * 10 : 0;
  const bucketOffsetMs = elapsedMs % 1000;
  const distanceToBoundaryMs = Math.min(bucketOffsetMs, 1000 - bucketOffsetMs);

  if (points <= 0) {
    return { variant: 'pending', points: null };
  }

  return distanceToBoundaryMs >= OPTIMISTIC_SPLASH_SAFE_MARGIN_MS
    ? { variant: 'points', points }
    : { variant: 'pending', points: null };
}

export function getQuestionDurationSeconds(question: ResolvedMatchQuestionPayload | null): number {
  if (!question?.playableAt || !question.deadlineAt) return 10;
  const playableAtMs = new Date(question.playableAt).getTime();
  const deadlineAtMs = new Date(question.deadlineAt).getTime();
  if (!Number.isFinite(playableAtMs) || !Number.isFinite(deadlineAtMs) || deadlineAtMs <= playableAtMs) {
    return 10;
  }
  return Math.max(1, Math.round((deadlineAtMs - playableAtMs) / 1000));
}

export function getQuestionProgress(params: {
  phase: string | undefined;
  question: ResolvedMatchQuestionPayload | null;
  questionInHalf: number;
}): number {
  const { phase, question, questionInHalf } = params;

  if (phase === 'HALFTIME') return 6;
  if (question?.phaseKind === 'last_attack') return 6;

  if (
    question?.phaseKind === 'normal' &&
    typeof question.phaseRound === 'number' &&
    question.phaseRound > 0
  ) {
    return ((question.phaseRound - 1) % 6) + 1;
  }

  if (typeof question?.qIndex === 'number') {
    return (question.qIndex % 6) + 1;
  }

  return Math.min(6, Math.max(0, questionInHalf));
}

export function toMultipleChoiceGameQuestion(
  question: ResolvedMatchQuestionPayload | null,
  correctIndex: number | undefined
): GameQuestion | null {
  if (!question || question.question.kind !== 'multipleChoice') return null;

  return {
    id: question.question.id,
    prompt: question.question.prompt,
    options: question.question.options,
    correctIndex: typeof correctIndex === 'number' ? correctIndex : -1,
    categoryId: question.question.categoryId,
    categoryName: question.question.categoryName,
    difficulty: question.question.difficulty,
    explanation: question.question.explanation ?? undefined,
  };
}

export function isHalftimeBanRetryableErrorCode(code: string | null | undefined): boolean {
  return code === 'MATCH_HALFTIME_BAN_ERROR'
    || code === 'MATCH_INVALID_BAN'
    || code === 'INVALID_CATEGORY'
    || code === 'MATCH_BUSY';
}
