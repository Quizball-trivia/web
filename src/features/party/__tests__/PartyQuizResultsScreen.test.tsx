import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FixedLocaleProvider } from '@/contexts/LocaleContext';
import { loadLocaleMessages } from '@/lib/i18n/client-messages';

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
  afterEach(() => { cleanup(); vi.useRealTimers(); });
  it('shows the score and usable navigation immediately, then a delayed saving message without estimated XP', () => {
    vi.useFakeTimers();
    const onMainMenu = vi.fn();
    const props = { finalResults: makeFinalResults(), participants, selfUserId: 'high-score', onPlayAgain: vi.fn(), onMainMenu };
    const { rerender } = render(<PartyQuizResultsScreen {...props} rewards={{ matchId: 'party-match-1', status: 'pending', xpEarned: null }} />);
    expect(screen.getByText('You won the party quiz!')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Play Again' })).toBeEnabled();
    expect(screen.queryByText('+70')).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(2_000));
    expect(screen.getByRole('status')).toHaveTextContent('Saving your rewards… You can keep playing.');
    fireEvent.click(screen.getByRole('button', { name: 'Main Menu' }));
    expect(onMainMenu).toHaveBeenCalledOnce();
    rerender(<PartyQuizResultsScreen {...props} rewards={{ matchId: 'party-match-1', status: 'complete', xpEarned: 37 }} />);
    expect(screen.getByText('+37')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
  it('never flashes saving for a fast completion and hides rewards for ineligible players', () => {
    vi.useFakeTimers();
    const props = { finalResults: makeFinalResults(), participants, selfUserId: 'high-score', onPlayAgain: vi.fn(), onMainMenu: vi.fn() };
    const { rerender } = render(<PartyQuizResultsScreen {...props} rewards={{ matchId: 'party-match-1', status: 'pending', xpEarned: null }} />);
    act(() => vi.advanceTimersByTime(500));
    rerender(<PartyQuizResultsScreen {...props} rewards={{ matchId: 'party-match-1', status: 'complete', xpEarned: 70 }} />);
    act(() => vi.advanceTimersByTime(3_000));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByText('+70')).toBeInTheDocument();
    rerender(<PartyQuizResultsScreen {...props} rewards={{ matchId: 'party-match-1', status: 'ineligible', xpEarned: null }} />);
    expect(screen.queryByTestId('party-rewards')).not.toBeInTheDocument();
  });
  it('does not reuse a receipt from a different match and does not call a failed job saving', () => {
    const props = { finalResults: makeFinalResults(), participants, selfUserId: 'high-score', onPlayAgain: vi.fn(), onMainMenu: vi.fn() };
    const { rerender } = render(<PartyQuizResultsScreen {...props} rewards={{ matchId: 'old-match', status: 'complete', xpEarned: 70 }} />);
    expect(screen.queryByText('+70')).not.toBeInTheDocument();
    rerender(<PartyQuizResultsScreen {...props} rewards={{ matchId: 'party-match-1', status: 'failed', xpEarned: 37 }} />);
    expect(screen.getByText('+37')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Some rewards could not be saved. Please contact support.');
  });
  it.each([
    ['en', 'Saving your rewards'], ['es', 'Guardando tus recompensas'],
    ['ka', 'ჯილდოები ინახება'], ['tr', 'Ödüllerin kaydediliyor'],
  ] as const)('translates the delayed status in %s', async (locale, message) => {
    // Match the app's already-loaded locale before exercising reward timers.
    await loadLocaleMessages(locale);
    vi.useFakeTimers();
    render(<FixedLocaleProvider locale={locale}><PartyQuizResultsScreen finalResults={makeFinalResults()} participants={participants}
      selfUserId="high-score" onPlayAgain={vi.fn()} onMainMenu={vi.fn()}
      rewards={{ matchId: 'party-match-1', status: 'pending', xpEarned: null }} /></FixedLocaleProvider>);
    act(() => vi.advanceTimersByTime(2_000));
    expect(screen.getByRole('status')).toHaveTextContent(message);
  });
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
    expect(firstPlace).toHaveStyle({ backgroundColor: '#FFD700' }); // gold
    expect(secondPlace).toHaveStyle({ backgroundColor: '#C7CBD1' }); // silver
    expect(thirdPlace).toHaveStyle({ backgroundColor: '#CD7F32' }); // bronze

    expect(firstPlace.parentElement).toHaveClass('order-2');
    expect(secondPlace.parentElement).toHaveClass('order-1');
    expect(thirdPlace.parentElement).toHaveClass('order-3');
  });
});
