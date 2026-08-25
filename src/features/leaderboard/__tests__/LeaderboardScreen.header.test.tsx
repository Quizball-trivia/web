import { render, screen, waitFor, within } from '@testing-library/react';
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

const getLeaderboardMock = vi.fn();
const getLeaderboardSeasonsMock = vi.fn();

vi.mock('@/lib/repositories/leaderboard.repo', () => ({
  getLeaderboard: (...args: unknown[]) => getLeaderboardMock(...args),
  getUserRank: vi.fn(async () => ({ data: null, error: null })),
  getLeaderboardSeasons: (...args: unknown[]) => getLeaderboardSeasonsMock(...args),
  getAuctionLeaderboard: vi.fn(async () => ({ data: [], error: null })),
  getAuctionUserRank: vi.fn(async () => ({ data: null, error: null })),
}));

const SEASON_1 = { id: 'season-1', seasonNumber: 1, startedAt: '2026-01-01', endedAt: '2026-04-01' };

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  vi.clearAllMocks();
  getLeaderboardMock.mockResolvedValue({ data: [entry('u1', 'RankedOne', 1, 1200)], error: null });
  getLeaderboardSeasonsMock.mockResolvedValue({
    data: { seasons: [SEASON_1], currentSeasonNumber: 2 },
    error: null,
  });
  useAuthStore.setState({ status: 'authenticated' });
});

/** Opens a select by its aria-label and returns the listbox popover. */
async function openSelect(user: ReturnType<typeof userEvent.setup>, label: string) {
  await user.click(await screen.findByRole('button', { name: label }));
  return await screen.findByRole('listbox', { name: label });
}

describe('LeaderboardScreen — header bar', () => {
  it('replaces the season/scope pill rows with two dropdowns', async () => {
    render(<LeaderboardScreen currentPlayerId="u1" />, { wrapper });

    const seasonTrigger = await screen.findByRole('button', { name: 'Select season' });
    expect(seasonTrigger).toHaveTextContent('Season 2');
    expect(screen.getByRole('button', { name: 'Select region' })).toHaveTextContent('Global');

    // The old pill rows were `role="tab"` — only the two mode tabs remain.
    expect(screen.getAllByRole('tab')).toHaveLength(2);
  });

  it('switches season from the dropdown and refetches that season', async () => {
    const user = userEvent.setup();
    render(<LeaderboardScreen currentPlayerId="u1" />, { wrapper });

    const listbox = await openSelect(user, 'Select season');
    // Live season is active by default.
    expect(within(listbox).getByRole('option', { name: /Season 2/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );

    await user.click(within(listbox).getByRole('option', { name: /Season 1/ }));

    // Closes on select, and the archived season drives the query.
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
    await waitFor(() =>
      expect(getLeaderboardMock).toHaveBeenCalledWith('global', 50, 0, 'season-1'),
    );
    expect(screen.getByRole('button', { name: 'Select season' })).toHaveTextContent('Season 1');
  });

  it('shows the FINAL STANDINGS caption only for an archived season', async () => {
    const user = userEvent.setup();
    render(<LeaderboardScreen currentPlayerId="u1" />, { wrapper });

    await screen.findByRole('button', { name: 'Select season' });
    expect(screen.queryByText('Final standings')).not.toBeInTheDocument();

    const listbox = await openSelect(user, 'Select season');
    await user.click(within(listbox).getByRole('option', { name: /Season 1/ }));

    expect(await screen.findByText('Final standings')).toBeInTheDocument();
  });

  it('switches region from the dropdown', async () => {
    const user = userEvent.setup();
    render(<LeaderboardScreen currentPlayerId="u1" />, { wrapper });

    const listbox = await openSelect(user, 'Select region');
    await user.click(within(listbox).getByRole('option', { name: 'Country' }));

    await waitFor(() =>
      expect(getLeaderboardMock).toHaveBeenCalledWith('country', 50, 0, undefined),
    );
    expect(screen.getByRole('button', { name: 'Select region' })).toHaveTextContent('Country');
  });

  it('hides the season dropdown on the auction board but keeps region', async () => {
    const user = userEvent.setup();
    render(<LeaderboardScreen currentPlayerId="u1" />, { wrapper });

    await screen.findByRole('button', { name: 'Select season' });

    await user.click(screen.getByRole('tab', { name: 'Auction' }));

    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Select season' })).not.toBeInTheDocument(),
    );
    expect(screen.getByRole('button', { name: 'Select region' })).toBeInTheDocument();
  });

  it('hides the season dropdown when no season has been archived yet', async () => {
    getLeaderboardSeasonsMock.mockResolvedValue({
      data: { seasons: [], currentSeasonNumber: 1 },
      error: null,
    });
    render(<LeaderboardScreen currentPlayerId="u1" />, { wrapper });

    expect(await screen.findByRole('button', { name: 'Select region' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Select season' })).not.toBeInTheDocument();
  });

  it('closes the dropdown on Escape', async () => {
    const user = userEvent.setup();
    render(<LeaderboardScreen currentPlayerId="u1" />, { wrapper });

    await openSelect(user, 'Select region');
    await user.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
  });
});
