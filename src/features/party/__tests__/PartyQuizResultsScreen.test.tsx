import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { MatchFinalResultsPayload, MatchParticipant } from '@/lib/realtime/socket.types';

import { PartyQuizResultsScreen } from '../PartyQuizResultsScreen';

vi.mock('@/components/AvatarDisplay', () => ({
  AvatarDisplay: ({ className }: { className?: string }) => (
    <div data-testid="avatar" className={className} />
  ),
}));

const participants: MatchParticipant[] = [
  { userId: 'low-score', username: 'Low Score', avatarUrl: null, seat: 1 },
  { userId: 'high-score', username: 'High Score', avatarUrl: null, seat: 2 },
  { userId: 'mid-score', username: 'Mid Score', avatarUrl: null, seat: 3 },
];

function makeFinalResults(): MatchFinalResultsPayload {
  return {
    matchId: 'party-match-1',
    winnerId: 'high-score',
    players: {
      'low-score': { totalPoints: 80, correctAnswers: 1, avgTimeMs: 4_000 },
      'high-score': { totalPoints: 260, correctAnswers: 3, avgTimeMs: 5_000 },
      'mid-score': { totalPoints: 160, correctAnswers: 2, avgTimeMs: 3_000 },
    },
    // Intentionally wrong payload ranks. The results screen must recompute
    // display ranks from score so the podium cannot render inverted.
    standings: [
      { userId: 'low-score', rank: 1, totalPoints: 80, correctAnswers: 1, avgTimeMs: 4_000 },
      { userId: 'high-score', rank: 3, totalPoints: 260, correctAnswers: 3, avgTimeMs: 5_000 },
      { userId: 'mid-score', rank: 2, totalPoints: 160, correctAnswers: 2, avgTimeMs: 3_000 },
    ],
    totalQuestions: 8,
    durationMs: 180_000,
    resultVersion: 1,
  };
}

describe('PartyQuizResultsScreen', () => {
  it('renders the highest score as the tallest first-place podium block', () => {
    render(
      <PartyQuizResultsScreen
        finalResults={makeFinalResults()}
        participants={participants}
        selfUserId="low-score"
        onPlayAgain={vi.fn()}
        onMainMenu={vi.fn()}
      />,
    );

    const firstPlace = screen.getByTestId('party-podium-block-1');
    const secondPlace = screen.getByTestId('party-podium-block-2');
    const thirdPlace = screen.getByTestId('party-podium-block-3');

    expect(within(firstPlace).getByText('High Score')).toBeInTheDocument();
    expect(within(secondPlace).getByText('Mid Score')).toBeInTheDocument();
    expect(within(thirdPlace).getByText('Low Score')).toBeInTheDocument();

    // Min-heights (not fixed heights) so blocks grow to fit the name + score
    // instead of clipping; 1st remains the tallest, 3rd the shortest.
    expect(firstPlace).toHaveClass('min-h-44', 'sm:min-h-52');
    expect(secondPlace).toHaveClass('min-h-36', 'sm:min-h-44');
    expect(thirdPlace).toHaveClass('min-h-32', 'sm:min-h-40');
    expect(firstPlace).toHaveStyle({ backgroundColor: '#38B60E' });
    expect(secondPlace).toHaveStyle({ backgroundColor: '#FFE500' });
    expect(thirdPlace).toHaveStyle({ backgroundColor: '#1645FF' });

    expect(firstPlace.parentElement).toHaveClass('order-2');
    expect(secondPlace.parentElement).toHaveClass('order-1');
    expect(thirdPlace.parentElement).toHaveClass('order-3');
  });
});
