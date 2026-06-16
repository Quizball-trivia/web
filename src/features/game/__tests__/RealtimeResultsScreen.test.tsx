import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the head-to-head query — the real one hits react-query + the API
// client. Returning `{ data: undefined }` keeps the "MATCH COMPLETE" label
// path (no h2h record yet). Per-test overrides drive the "N GAMES PLAYED"
// branch.
const useHeadToHeadMock = vi.fn().mockReturnValue({ data: undefined });
vi.mock('@/lib/queries/stats.queries', () => ({
  useHeadToHead: (...args: unknown[]) => useHeadToHeadMock(...args),
}));

// Pin analytics emits so we can assert "fire once on mount" semantics.
const trackMatchResultsViewedMock = vi.fn();
const trackLevelUpMock = vi.fn();
const trackDivisionPromotedMock = vi.fn();
vi.mock('@/lib/analytics/game-events', () => ({
  trackMatchResultsViewed: (...args: unknown[]) => trackMatchResultsViewedMock(...args),
  trackLevelUp: (...args: unknown[]) => trackLevelUpMock(...args),
  trackDivisionPromoted: (...args: unknown[]) => trackDivisionPromotedMock(...args),
}));

// Mock AchievementUnlockStrip — it does its own internal animation /
// store reads that would pull in unrelated mocks. We only need to verify
// it's rendered (not what it renders) for these regression tests.
vi.mock('@/components/match/AchievementUnlockStrip', () => ({
  AchievementUnlockStrip: ({ achievements }: { achievements: unknown[] }) => (
    <div data-testid="achievement-strip" data-count={achievements.length} />
  ),
}));

// Mock AvatarDisplay — it loads SVG assets through Next.js Image which
// vitest doesn't resolve. Stub it to a div so the layout still renders.
vi.mock('@/components/AvatarDisplay', () => ({
  AvatarDisplay: ({ size }: { size?: string }) => (
    <div data-testid="avatar" data-size={size} />
  ),
}));

import { RealtimeResultsScreen } from '../RealtimeResultsScreen';
import type { RankedMatchOutcomePayload } from '@/lib/realtime/socket.types';
import type { RankedProfileResponse } from '@/lib/repositories/ranked.repo';

const SELF_ID = 'user-self';
const OPP_ID = 'user-opp';

function renderResults(overrides: Partial<Parameters<typeof RealtimeResultsScreen>[0]> = {}) {
  const onPlayAgain = vi.fn();
  const onMainMenu = vi.fn();
  const utils = render(
    <RealtimeResultsScreen
      matchType="friendly"
      playerUsername="Player One"
      playerAvatar="avatar-1"
      opponentUsername="Opponent"
      opponentAvatar="avatar-2"
      playerScore={3}
      opponentScore={1}
      playerCorrect={9}
      opponentCorrect={5}
      totalQuestions={12}
      selfUserId={SELF_ID}
      opponentId={OPP_ID}
      onPlayAgain={onPlayAgain}
      onMainMenu={onMainMenu}
      {...overrides}
    />,
  );
  return { ...utils, onPlayAgain, onMainMenu };
}

beforeEach(() => {
  useHeadToHeadMock.mockReturnValue({ data: undefined });
  trackMatchResultsViewedMock.mockClear();
  trackLevelUpMock.mockClear();
  trackDivisionPromotedMock.mockClear();
});

describe('RealtimeResultsScreen — result heading branches', () => {
  it('renders VICTORY when finalWinnerId matches selfUserId', () => {
    renderResults({ finalWinnerId: SELF_ID, playerScore: 3, opponentScore: 1 });
    expect(screen.getByRole('heading', { level: 1, name: /victory/i })).toBeInTheDocument();
  });

  it('renders DEFEAT when finalWinnerId is the opponent', () => {
    renderResults({ finalWinnerId: OPP_ID, playerScore: 1, opponentScore: 3 });
    expect(screen.getByRole('heading', { level: 1, name: /defeat/i })).toBeInTheDocument();
  });

  it('renders DRAW when finalWinnerId is null (authoritative draw)', () => {
    renderResults({ finalWinnerId: null, playerScore: 2, opponentScore: 2 });
    expect(screen.getByRole('heading', { level: 1, name: /draw/i })).toBeInTheDocument();
  });

  it('renders Cancelled for cancelled no-contest results', () => {
    renderResults({
      matchType: 'ranked',
      finalWinnerId: null,
      winnerDecisionMethod: 'forfeit',
      cancelledNoContest: true,
      playerScore: 0,
      opponentScore: 0,
    });

    expect(screen.getByRole('heading', { level: 1, name: /cancelled/i })).toBeInTheDocument();
    expect(screen.getByText(/no contest/i)).toBeInTheDocument();
  });

  it('falls back to score comparison when finalWinnerId is undefined', () => {
    renderResults({ finalWinnerId: undefined, playerScore: 5, opponentScore: 2 });
    expect(screen.getByRole('heading', { level: 1, name: /victory/i })).toBeInTheDocument();
  });
});

describe('RealtimeResultsScreen — ranked vs friendly branching', () => {
  const buildRankedOutcome = (
    overrides: Partial<RankedMatchOutcomePayload['byUserId'][string]> = {},
  ): RankedMatchOutcomePayload => ({
    isPlacement: false,
    byUserId: {
      [SELF_ID]: {
        userId: SELF_ID,
        oldRp: 1900,
        newRp: 1925,
        deltaRp: 25,
        oldTier: 'Key Player',
        newTier: 'Key Player',
        placementStatus: 'placed',
        placementPlayed: 3,
        placementRequired: 3,
        isPlacement: false,
        ...overrides,
      },
      [OPP_ID]: {
        userId: OPP_ID,
        oldRp: 1900,
        newRp: 1875,
        deltaRp: -25,
        oldTier: 'Key Player',
        newTier: 'Key Player',
        placementStatus: 'placed',
        placementPlayed: 3,
        placementRequired: 3,
        isPlacement: false,
      },
    },
  });

  it('shows the ranked RP card when matchType=ranked and a non-placement outcome arrives', () => {
    renderResults({
      matchType: 'ranked',
      finalWinnerId: SELF_ID,
      rankedOutcome: buildRankedOutcome(),
      preMatchRp: 1900,
    });
    // The RP card renders the delta as a standalone chip ("+25") next to
    // the animated RP counter (starts at oldRp, animates to newRp).
    expect(screen.getByText('+25')).toBeInTheDocument();
  });

  it('does not show the ranked RP card on a friendly match', () => {
    renderResults({ matchType: 'friendly', finalWinnerId: SELF_ID });
    // The RP card is the only thing on this screen that renders the
    // literal "RP" suffix on its own (the new-rank counter row).
    expect(screen.queryByText(/^RP$/)).not.toBeInTheDocument();
  });

  it('does not show the ranked RP card during a placement match even when ranked', () => {
    const preMatchRankedProfile: RankedProfileResponse = {
      rp: 1900,
      tier: 'Key Player',
      placementStatus: 'in_progress',
      placementPlayed: 1,
      placementRequired: 3,
      placementWins: 1,
      currentWinStreak: 0,
      lastRankedMatchAt: null,
    };
    renderResults({
      matchType: 'ranked',
      finalWinnerId: SELF_ID,
      preMatchRankedProfile,
      rankedOutcome: buildRankedOutcome({ isPlacement: true, placementStatus: 'in_progress' }),
    });
    // No "+N RP" pill on a placement match — the placement-progress card
    // owns the screen instead.
    expect(screen.queryByText(/\+25 RP/i)).not.toBeInTheDocument();
  });
});

describe('RealtimeResultsScreen — head-to-head label', () => {
  it('shows "MATCH COMPLETE" when no h2h record is available', () => {
    renderResults();
    expect(screen.getByText(/match complete/i)).toBeInTheDocument();
  });

  it('shows "N GAMES PLAYED" when h2h record is loaded', () => {
    useHeadToHeadMock.mockReturnValue({ data: { total: 5 } });
    renderResults();
    expect(screen.getByText(/5 games played/i)).toBeInTheDocument();
  });

  it('uses singular "GAME" for exactly one prior match', () => {
    useHeadToHeadMock.mockReturnValue({ data: { total: 1 } });
    renderResults();
    expect(screen.getByText(/1 game played/i)).toBeInTheDocument();
  });
});

describe('RealtimeResultsScreen — action callbacks', () => {
  it('calls onPlayAgain when the play-again button is clicked', () => {
    const { onPlayAgain } = renderResults();
    fireEvent.click(screen.getByRole('button', { name: /play again/i }));
    expect(onPlayAgain).toHaveBeenCalledTimes(1);
  });

  it('calls onMainMenu when the main-menu button is clicked', () => {
    const { onMainMenu } = renderResults();
    fireEvent.click(screen.getByRole('button', { name: /main menu/i }));
    expect(onMainMenu).toHaveBeenCalledTimes(1);
  });
});

describe('RealtimeResultsScreen — fire-once analytics', () => {
  it('fires trackMatchResultsViewed exactly once on mount with the right shape', () => {
    renderResults({
      matchType: 'ranked',
      finalWinnerId: SELF_ID,
      playerScore: 3,
      opponentScore: 1,
    });
    expect(trackMatchResultsViewedMock).toHaveBeenCalledTimes(1);
    expect(trackMatchResultsViewedMock).toHaveBeenCalledWith(
      'ranked',
      true, // playerWon
      3,
      1,
      0, // rpChange defaults to 0 when there's no rankedOutcome
    );
  });

  it('does not re-fire analytics on rerender with the same props', () => {
    const { rerender } = renderResults({
      finalWinnerId: SELF_ID,
      playerScore: 3,
      opponentScore: 1,
    });
    expect(trackMatchResultsViewedMock).toHaveBeenCalledTimes(1);

    rerender(
      <RealtimeResultsScreen
        matchType="friendly"
        playerUsername="Player One"
        playerAvatar="avatar-1"
        opponentUsername="Opponent"
        opponentAvatar="avatar-2"
        playerScore={3}
        opponentScore={1}
        playerCorrect={9}
        opponentCorrect={5}
        totalQuestions={12}
        selfUserId={SELF_ID}
        opponentId={OPP_ID}
        finalWinnerId={SELF_ID}
        onPlayAgain={vi.fn()}
        onMainMenu={vi.fn()}
      />,
    );
    expect(trackMatchResultsViewedMock).toHaveBeenCalledTimes(1);
  });
});

describe('RealtimeResultsScreen — achievements strip', () => {
  it('forwards the achievement count to AchievementUnlockStrip', () => {
    const unlocked = [
      {
        id: 'first_win',
        title: { en: 'First Win' },
        description: { en: 'You did it.' },
        unlocked: true,
        progress: 1,
        target: 1,
        unlockedAt: '2026-05-26T00:00:00Z',
      },
    ];
    renderResults({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      unlockedAchievements: unlocked as any,
    });
    const strip = screen.getByTestId('achievement-strip');
    expect(strip).toHaveAttribute('data-count', '1');
  });

  it('renders the achievement strip even with an empty achievements array (zero state)', () => {
    renderResults();
    const strip = screen.getByTestId('achievement-strip');
    expect(strip).toHaveAttribute('data-count', '0');
  });
});
