import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/stores/auth.store';
import { useAuthPromptStore } from '@/stores/authPrompt.store';
import { LeaderboardScreen } from '../LeaderboardScreen';

const nav = vi.hoisted(() => ({ search: '', replace: vi.fn(), push: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: nav.push, replace: nav.replace }),
  usePathname: () => '/leaderboard',
  useSearchParams: () => new URLSearchParams(nav.search),
}));

function entry(userId: string, username: string, rank: number, points: number) {
  return {
    userId, rank, username, avatarUrl: null, avatarCustomization: null,
    rp: points, tier: 'Captain', country: 'GE', trend: 'same' as const, trendValue: 0,
  };
}

const getBoardMock = vi.fn();
const getBoardRankMock = vi.fn();
const getStandingsMock = vi.fn();
vi.mock('@/lib/repositories/leaderboard.repo', () => ({
  getBoard: (...args: unknown[]) => getBoardMock(...args),
  getBoardRank: (...args: unknown[]) => getBoardRankMock(...args),
  getStandings: (...args: unknown[]) => getStandingsMock(...args),
  getLeaderboardSeasons: vi.fn(async () => ({
    data: { seasons: [{ id: 'season-1', seasonNumber: 1, startedAt: '2026-01-01', endedAt: '2026-04-01' }], currentSeasonNumber: 2 },
    error: null,
  })),
}));

const CLUBS = {
  standings: [
    { key: 'fc-barcelona', rank: 1, players: 692, score: 72180, topPlayer: { username: 'Nika903', points: 9340 } },
    { key: 'real-madrid-cf', rank: 2, players: 475, score: 55275, topPlayer: { username: 'Jacob77sa', points: 18400 } },
  ],
  viewer: { mine: 'fc-barcelona', slot: null, gap: 512, points: 1328 },
};
const NATIONS = {
  standings: [
    { key: 'GE', rank: 1, players: 2291, score: 90000, topPlayer: { username: 'enigma', points: 9000 } },
    { key: 'AR', rank: 2, players: 170, score: 13555, topPlayer: { username: 'Letoh', points: 2440 } },
  ],
  viewer: { mine: 'GE', slot: 7, gap: null, points: 1840 },
};

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const ME = { id: 'me', country: 'GE', favorite_club: 'FC Barcelona' };

beforeEach(() => {
  vi.clearAllMocks();
  nav.search = '';
  getBoardMock.mockResolvedValue([entry('p1', 'TopOne', 1, 2400), entry('p2', 'Second', 2, 2300), entry('p3', 'Third', 3, 2200)]);
  getBoardRankMock.mockResolvedValue({
    ...entry('me', 'Me', 16, 1840), total: 692, nextTarget: { username: 'KAKHA_GK', rank: 15, gap: 53 },
  });
  getStandingsMock.mockImplementation(async (_mode: string, kind: string) => (kind === 'club' ? CLUBS : NATIONS));
  useAuthStore.setState({ status: 'authenticated', user: ME as never });
});

describe('LeaderboardScreen boards', () => {
  it('opens on the world board and shows the next player to pass', async () => {
    render(<LeaderboardScreen currentPlayerId="me" />, { wrapper });
    await waitFor(() => expect(getBoardMock).toHaveBeenCalledWith('ranked', { kind: 'global' }, 50, 0, undefined));
    expect(await screen.findByText(/53 RP to pass KAKHA_GK \(#15\)/)).toBeInTheDocument();
    // Board sizes stay hidden for now.
    expect(screen.queryByText(/of 692/)).not.toBeInTheDocument();
  });

  it('switches to my club board and labels it with the club fans', async () => {
    const user = userEvent.setup();
    render(<LeaderboardScreen currentPlayerId="me" />, { wrapper });
    const tabs = await screen.findByRole('tablist', { name: 'Choose a board' });
    await user.click(within(tabs).getByRole('tab', { name: /Club/ }));
    await waitFor(() => expect(getBoardMock).toHaveBeenCalledWith('ranked', { kind: 'club', club: 'fc-barcelona' }, 50, 0, undefined));
    expect(await screen.findByRole('heading', { name: /Top FC Barcelona fans/i })).toBeInTheDocument();
    await waitFor(() => expect(nav.replace).toHaveBeenLastCalledWith('/leaderboard?board=club&club=fc-barcelona', { scroll: false }));
  });

  it('browses another country from the picker', async () => {
    const user = userEvent.setup();
    nav.search = 'board=country&country=GE';
    render(<LeaderboardScreen currentPlayerId="me" />, { wrapper });
    await user.click(await screen.findByRole('button', { name: /Change/ }));
    await user.type(await screen.findByLabelText('Search countries'), 'argen');
    await user.click(await screen.findByRole('button', { name: /Argentina/ }));
    await waitFor(() => expect(getBoardMock).toHaveBeenCalledWith('ranked', { kind: 'country', country: 'AR' }, 50, 0, undefined));
    expect(await screen.findByText(/Browsing Argentina/i)).toBeInTheDocument();
    // The sheet lists every supported country (~250 rows).
  }, 15_000);

  it('opens club standings from a shared link with the viewer contribution', async () => {
    nav.search = 'board=club&club=fc-barcelona&view=standings';
    render(<LeaderboardScreen currentPlayerId="me" />, { wrapper });
    expect(await screen.findByText(/512 RP more to make the top 10 that scores/i)).toBeInTheDocument();
    expect(getStandingsMock).toHaveBeenCalledWith('ranked', 'club');
    expect(screen.getAllByText('Real Madrid CF').length).toBeGreaterThan(0);
  });

  it('gives guests a sign-in card instead of a rank, and never asks for their rank', async () => {
    useAuthStore.setState({ status: 'anonymous', user: null });
    const open = vi.fn();
    useAuthPromptStore.setState({ open } as never);
    const user = userEvent.setup();
    nav.search = 'board=club&club=fc-barcelona';
    render(<LeaderboardScreen />, { wrapper });
    await user.click(await screen.findByRole('button', { name: 'Sign in' }));
    expect(open).toHaveBeenCalled();
    expect(getBoardRankMock).not.toHaveBeenCalled();
    expect(getBoardMock).toHaveBeenCalledWith('ranked', { kind: 'club', club: 'fc-barcelona' }, 50, 0, undefined);
  });

  it('reads the auction board for the auction tab', async () => {
    const user = userEvent.setup();
    render(<LeaderboardScreen currentPlayerId="me" />, { wrapper });
    await user.click(await screen.findByRole('tab', { name: /Auction/i }));
    await waitFor(() => expect(getBoardMock).toHaveBeenCalledWith('auction', { kind: 'global' }, 50, 0, undefined));
    await waitFor(() => expect(nav.replace).toHaveBeenLastCalledWith('/leaderboard?mode=auction', { scroll: false }));
  });

  it('refetches the ranked board for an archived season', async () => {
    const user = userEvent.setup();
    render(<LeaderboardScreen currentPlayerId="me" />, { wrapper });
    await user.click(await screen.findByRole('button', { name: 'Select season' }));
    await user.click(await screen.findByRole('option', { name: /Season 1/ }));
    await waitFor(() => expect(getBoardMock).toHaveBeenCalledWith('ranked', { kind: 'global' }, 50, 0, 'season-1'));
  });

  it('holds the board and the rank strip in place while the session check runs', () => {
    useAuthStore.setState({ status: 'loading', user: null });
    const { container } = render(<LeaderboardScreen />, { wrapper });
    expect(container.querySelectorAll('[data-lb-skeleton-row]').length).toBeGreaterThan(0);
    expect(container.querySelector('.animate-spin')).toBeNull();
    // Members would see a sign-in card flash before their rank: nothing is offered until the session is known.
    expect(screen.queryByRole('button', { name: 'Sign in' })).not.toBeInTheDocument();
    expect(getBoardMock).not.toHaveBeenCalled();
  });

  it('shows the skeleton, not a spinner, while switching boards', async () => {
    const user = userEvent.setup();
    const { container } = render(<LeaderboardScreen currentPlayerId="me" />, { wrapper });
    expect((await screen.findAllByText('TopOne')).length).toBeGreaterThan(0);
    getBoardMock.mockImplementation(() => new Promise(() => {}));
    await user.click(screen.getByRole('tab', { name: /Auction/i }));
    expect(container.querySelectorAll('[data-lb-skeleton-row]').length).toBeGreaterThan(0);
    expect(container.querySelector('.animate-spin')).toBeNull();
  });
});
