/**
 * Pure helpers for the realtime party quiz screen.
 *
 * Each function here is referentially stable and side-effect-free so the
 * presentational components, the view-model, and the score-flight hook
 * can all import without dragging in React state.
 */

import type { AnswerStateArray } from '@/lib/types/game.types';
import type { MatchParticipant } from '@/lib/realtime/socket.types';
import type { StandingDotStatus } from './partyQuizScreen.types';

export function toAnswerStates(
  optionsCount: number,
  selectedAnswer: number | null,
  selfAnsweredCorrectly: boolean | null,
): AnswerStateArray {
  if (selectedAnswer === null) {
    return Array.from({ length: optionsCount }, () => 'default') as AnswerStateArray;
  }

  if (selfAnsweredCorrectly === true) {
    return Array.from({ length: optionsCount }, (_, index) => (
      index === selectedAnswer ? 'correct' : 'disabled'
    )) as AnswerStateArray;
  }

  if (selfAnsweredCorrectly === false) {
    return Array.from({ length: optionsCount }, (_, index) => (
      index === selectedAnswer ? 'wrong' : 'disabled'
    )) as AnswerStateArray;
  }

  return Array.from({ length: optionsCount }, (_, index) => (
    index === selectedAnswer ? 'default' : 'disabled'
  )) as AnswerStateArray;
}

export function toRevealAnswerStates(
  optionsCount: number,
  correctIndex: number | undefined,
  selectedAnswer: number | null,
): AnswerStateArray {
  return Array.from({ length: optionsCount }, (_, index) => {
    if (index === correctIndex) return 'correct';
    if (selectedAnswer === index) return 'wrong';
    return 'disabled';
  }) as AnswerStateArray;
}

export function buildParticipantMap(participants: MatchParticipant[]): Map<string, MatchParticipant> {
  return new Map(participants.map((participant) => [participant.userId, participant]));
}

export function getStandingDotStatus(params: {
  roundResolved: boolean;
  answered: boolean;
  showOptions: boolean;
}): StandingDotStatus {
  if (params.roundResolved) return 'resolved';
  if (params.answered) return 'correct';
  if (params.showOptions) return 'answering';
  return 'idle';
}

// Hex color per rank — shared by the standings borders/pills and the
// per-player pick chips on the question card, so each player has a single
// recognisable accent colour across the screen.
const RANK_HEX: Record<number, string> = {
  1: '#38B60E',
  2: '#FFE500',
  3: '#1645FF',
  4: '#FF9600',
  5: '#FF4B4B',
  6: '#CE82FF',
};

export const PARTY_SUCCESS_FLIGHT_MS = 1150;
export const PARTY_FAILED_FLIGHT_MS = 2000;

export function getRankHex(rank: number): string {
  return RANK_HEX[rank] ?? RANK_HEX[6]!;
}

export function isUsableScoreAnchor(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;
  if (rect.bottom < 0 || rect.right < 0) return false;
  if (rect.top > window.innerHeight || rect.left > window.innerWidth) return false;

  const styles = window.getComputedStyle(element);
  return styles.display !== 'none' && styles.visibility !== 'hidden' && Number(styles.opacity) > 0;
}

// Per-rank styling — outlined card + pill colour rotate through the brand
// palette so each row reads as a distinct "slot" with a subtle matching tint.
export function getRankStyle(rank: number): {
  border: string;
  pillBg: string;
  glow: string;
  tint: string;
  selfGlow: string;
} {
  switch (rank) {
    case 1:
      return {
        border: 'border-brand-green',
        pillBg: 'bg-brand-green',
        glow: '0 1.76px 6.334px 1.32px rgba(56,182,14,0.25)',
        tint: 'bg-brand-green/[0.08]',
        selfGlow: '0 0 18px rgba(56,182,14,0.55), 0 0 36px rgba(56,182,14,0.25)',
      };
    case 2:
      return {
        border: 'border-brand-yellow',
        pillBg: 'bg-brand-yellow text-surface-page',
        glow: '0 1.76px 6.334px 1.32px rgba(255,229,0,0.25)',
        tint: 'bg-brand-yellow/[0.08]',
        selfGlow: '0 0 18px rgba(255,229,0,0.55), 0 0 36px rgba(255,229,0,0.25)',
      };
    case 3:
      return {
        border: 'border-brand-blue',
        pillBg: 'bg-brand-blue',
        glow: '0 1.76px 6.334px 1.32px rgba(22,69,255,0.25)',
        tint: 'bg-brand-blue/[0.08]',
        selfGlow: '0 0 18px rgba(22,69,255,0.6), 0 0 36px rgba(22,69,255,0.3)',
      };
    case 4:
      return {
        border: 'border-brand-orange',
        pillBg: 'bg-brand-orange',
        glow: '0 1.76px 6.334px 1.32px rgba(255,150,0,0.25)',
        tint: 'bg-brand-orange/[0.08]',
        selfGlow: '0 0 18px rgba(255,150,0,0.55), 0 0 36px rgba(255,150,0,0.25)',
      };
    case 5:
      return {
        border: 'border-brand-red-soft',
        pillBg: 'bg-brand-red-soft',
        glow: '0 1.76px 6.334px 1.32px rgba(255,75,75,0.25)',
        tint: 'bg-brand-red-soft/[0.08]',
        selfGlow: '0 0 18px rgba(255,75,75,0.55), 0 0 36px rgba(255,75,75,0.25)',
      };
    default:
      return {
        border: 'border-brand-purple',
        pillBg: 'bg-brand-purple',
        glow: '0 1.76px 6.334px 1.32px rgba(206,130,255,0.25)',
        tint: 'bg-brand-purple/[0.08]',
        selfGlow: '0 0 18px rgba(206,130,255,0.55), 0 0 36px rgba(206,130,255,0.25)',
      };
  }
}
