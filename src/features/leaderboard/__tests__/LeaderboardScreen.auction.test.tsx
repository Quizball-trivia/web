import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/stores/auth.store';
import { LeaderboardScreen } from '../LeaderboardScreen';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

function entry(userId: string, username: string, rank: number, rp: number) {
  return {
    userId,
    rank,
    username,
    avatarUrl: null,
    avatarCustomization: null,
    rp,
    tier: 'Bronze',
    country: 'GE',
    trend: 'same' as const,
    trendValue: 0,
  };
}

const RANKED_ENTRIES = [entry('u1', 'RankedOne', 1, 1200)];
const AUCTION_ENTRIES = [
  entry('a1', 'AuctionOne', 1, 250),
  entry('a2', 'AuctionTwo', 2, 130),
];
const TIC_TAC_TOE_ENTRIES = [
  entry('t1', 'GridOne', 1, 180),
  entry('t2', 'GridTwo', 2, 90),
];

const getAuctionLeaderboardMock = vi.fn();
const getAuctionUserRankMock = vi.fn();
const getTicTacToeLeaderboardMock = vi.fn();
const getTicTacToeUserRankMock = vi.fn();

vi.mock('@/lib/repositories/leaderboard.repo', () => ({
  getLeaderboard: vi.fn(async () => ({ data: RANKED_ENTRIES, error: null })),
  getUserRank: vi.fn(async () => ({ data: null, error: null })),
  getLeaderboardSeasons: vi.fn(async () => ({
    data: { seasons: [], currentSeasonNumber: 1 },
    error: null,
  })),
  getAuctionLeaderboard: (...args: unknown[]) => getAuctionLeaderboardMock(...args),
  getAuctionUserRank: (...args: unknown[]) => getAuctionUserRankMock(...args),
  getTicTacToeLeaderboard: (...args: unknown[]) => getTicTacToeLeaderboardMock(...args),
  getTicTacToeUserRank: (...args: unknown[]) => getTicTacToeUserRankMock(...args),
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  vi.clearAllMocks();
  getAuctionLeaderboardMock.mockResolvedValue({ data: AUCTION_ENTRIES, error: null });
  getAuctionUserRankMock.mockResolvedValue({ data: null, error: null });
  getTicTacToeLeaderboardMock.mockResolvedValue({ data: TIC_TAC_TOE_ENTRIES, error: null });
  getTicTacToeUserRankMock.mockResolvedValue({ data: null, error: null });
  useAuthStore.setState({ status: 'authenticated' });
});

describe('LeaderboardScreen — auction tab', () => {
  it('renders all mode tabs with ranked active by default', async () => {
    render(<LeaderboardScreen currentPlayerId="u1" />, { wrapper });

    expect(screen.getByRole('tab', { name: 'Ranked' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Auction' })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('tab', { name: 'Tic Tac Toe' })).toHaveAttribute(
      'aria-selected',
      'false',
    );

    await waitFor(() => expect(screen.getAllByText('RankedOne').length).toBeGreaterThan(0));
    expect(getAuctionLeaderboardMock).not.toHaveBeenCalled();
    expect(getTicTacToeLeaderboardMock).not.toHaveBeenCalled();
  });

  it('loads the auction board from the auction endpoint when the tab is picked', async () => {
    const user = userEvent.setup();
    render(<LeaderboardScreen currentPlayerId="u1" />, { wrapper });

    await user.click(screen.getByRole('tab', { name: 'Auction' }));

    await waitFor(() => expect(getAuctionLeaderboardMock).toHaveBeenCalledWith('global'));
    await waitFor(() => expect(screen.getByText('AuctionOne')).toBeInTheDocument());
    expect(screen.getByText('AuctionTwo')).toBeInTheDocument();
  });

  it('labels the points column AP and formats totals as plain integers', async () => {
    const user = userEvent.setup();
    render(<LeaderboardScreen currentPlayerId="u1" />, { wrapper });

    await user.click(screen.getByRole('tab', { name: 'Auction' }));

    await waitFor(() => expect(screen.getByText('AuctionOne')).toBeInTheDocument());
    expect(screen.getByText('AP')).toBeInTheDocument();
    expect(screen.getByText('250')).toBeInTheDocument();
    expect(screen.getByText('130')).toBeInTheDocument();
  });

  it('shows the own-rank strip from the auction endpoint', async () => {
    getAuctionUserRankMock.mockResolvedValue({
      data: { ...entry('u1', 'MyName', 7, 90), total: 40 },
      error: null,
    });
    const user = userEvent.setup();
    render(<LeaderboardScreen currentPlayerId="u1" />, { wrapper });

    await user.click(screen.getByRole('tab', { name: 'Auction' }));

    await waitFor(() => expect(getAuctionUserRankMock).toHaveBeenCalledWith('global'));
    await waitFor(() => expect(screen.getByText('MyName')).toBeInTheDocument());
    expect(screen.getByText('#7')).toBeInTheDocument();
    // Both the header total and the own-rank strip carry the AP unit (never RP).
    expect(screen.getAllByText(/90 AP/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/90 RP/)).not.toBeInTheDocument();
  });

  it('shows an empty state when nobody has auction points yet', async () => {
    getAuctionLeaderboardMock.mockResolvedValue({ data: [], error: null });
    const user = userEvent.setup();
    render(<LeaderboardScreen currentPlayerId="u1" />, { wrapper });

    await user.click(screen.getByRole('tab', { name: 'Auction' }));

    await waitFor(() =>
      expect(
        screen.getByText('No auction results yet. Play an auction to get on the board.'),
      ).toBeInTheDocument(),
    );
  });
});

describe('LeaderboardScreen — Tic Tac Toe tab', () => {
  it('loads the Tic Tac Toe board and labels its points as TP', async () => {
    const user = userEvent.setup();
    render(<LeaderboardScreen currentPlayerId="u1" />, { wrapper });

    await user.click(screen.getByRole('tab', { name: 'Tic Tac Toe' }));

    await waitFor(() => expect(getTicTacToeLeaderboardMock).toHaveBeenCalledWith('global'));
    await waitFor(() => expect(screen.getByText('GridOne')).toBeInTheDocument());
    expect(screen.getByText('GridTwo')).toBeInTheDocument();
    expect(screen.getByText('TP')).toBeInTheDocument();
    expect(screen.getByText('180')).toBeInTheDocument();
    expect(screen.getByText('90')).toBeInTheDocument();
  });

  it('shows the own-rank strip from the Tic Tac Toe endpoint', async () => {
    getTicTacToeUserRankMock.mockResolvedValue({
      data: { ...entry('u1', 'MyGridName', 9, 70), total: 45 },
      error: null,
    });
    const user = userEvent.setup();
    render(<LeaderboardScreen currentPlayerId="u1" />, { wrapper });

    await user.click(screen.getByRole('tab', { name: 'Tic Tac Toe' }));

    await waitFor(() => expect(getTicTacToeUserRankMock).toHaveBeenCalledWith('global'));
    await waitFor(() => expect(screen.getByText('MyGridName')).toBeInTheDocument());
    expect(screen.getByText('#9')).toBeInTheDocument();
    expect(screen.getAllByText(/70 TP/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/70 RP/)).not.toBeInTheDocument();
  });

  it('shows the dedicated empty state when nobody has TP yet', async () => {
    getTicTacToeLeaderboardMock.mockResolvedValue({ data: [], error: null });
    const user = userEvent.setup();
    render(<LeaderboardScreen currentPlayerId="u1" />, { wrapper });

    await user.click(screen.getByRole('tab', { name: 'Tic Tac Toe' }));

    await waitFor(() =>
      expect(
        screen.getByText(
          'No Tic Tac Toe results yet. Play an online match to get on the board.',
        ),
      ).toBeInTheDocument(),
    );
  });
});
