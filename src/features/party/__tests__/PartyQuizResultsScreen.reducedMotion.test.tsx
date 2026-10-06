import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MatchFinalResultsPayload, MatchParticipant } from '@/lib/realtime/socket.types';
import { PartyQuizResultsScreen } from '../PartyQuizResultsScreen';

vi.mock('@/components/AvatarDisplay', () => ({ AvatarDisplay: () => <div /> }));

const participants: MatchParticipant[] = [
  { userId: 'winner', username: 'Winner', avatarUrl: null, seat: 1 },
  { userId: 'other', username: 'Other', avatarUrl: null, seat: 2 },
];
const finalResults: MatchFinalResultsPayload = {
  matchId: 'm', winnerId: 'winner',
  players: { winner: { totalPoints: 20, correctAnswers: 2, avgTimeMs: 1_000 }, other: { totalPoints: 5, correctAnswers: 1, avgTimeMs: 1_000 } },
  standings: [
    { userId: 'winner', rank: 1, totalPoints: 20, correctAnswers: 2, avgTimeMs: 1_000 },
    { userId: 'other', rank: 2, totalPoints: 5, correctAnswers: 1, avgTimeMs: 1_000 },
  ],
  totalQuestions: 2, durationMs: 60_000, resultVersion: 1,
};
const prefersReducedMotion = (reduce: boolean) => {
  window.matchMedia = vi.fn((query: string) => ({
    matches: reduce && query.includes('prefers-reduced-motion: reduce'), media: query, onchange: null,
    addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
};
const confetti = () => document.querySelectorAll('div.pointer-events-none.absolute.inset-0 > div').length;
const original = window.matchMedia;

describe('PartyQuizResultsScreen — reduced motion (review 2026-10-06 W7)', () => {
  afterEach(() => { cleanup(); window.matchMedia = original; });

  it('a winner who asked for reduced motion gets no confetti burst', () => {
    prefersReducedMotion(true);
    render(<PartyQuizResultsScreen finalResults={finalResults} participants={participants} selfUserId="winner" onPlayAgain={vi.fn()} onMainMenu={vi.fn()} />);
    expect(confetti()).toBe(0);
  });

  it('everyone else still gets it', () => {
    prefersReducedMotion(false);
    render(<PartyQuizResultsScreen finalResults={finalResults} participants={participants} selfUserId="winner" onPlayAgain={vi.fn()} onMainMenu={vi.fn()} />);
    expect(confetti()).toBe(30);
  });
});
