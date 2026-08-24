import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { UseRealtimeAuctionMatchParams } from '../realtime/useRealtimeAuctionMatch';
import { AuctionFlowScreen } from '../AuctionFlowScreen';

const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock('@/contexts/LocaleContext', () => ({
  useLocale: () => ({
    locale: 'en',
    t: (key: string, params?: Record<string, unknown>) => {
      if (key === 'auctionGame.startAuction') return 'Start Auction';
      if (key === 'auctionGame.findingPlayers') return 'Finding players';
      if (key === 'auctionGame.lookingForOpponents') return `Looking for ${String(params?.count ?? 0)} opponents`;
      if (key === 'auctionGame.searchStatus') return `${String(params?.count ?? 0)}/3 players found`;
      if (key === 'auctionGame.connectingPlayers') return 'Connecting players...';
      if (key === 'auctionGame.auctionUnavailable') return 'Auction unavailable';
      if (key === 'auctionGame.signInToPlay') return 'Sign in to play Auction.';
      if (key === 'auctionGame.youLabel') return 'You';
      if (key === 'common.cancel') return 'Cancel';
      if (key === 'common.reconnecting') return 'Reconnecting...';
      if (key === 'common.connectionBad') return 'Connection problem';
      if (key === 'auctionGame.auctionPaused') return 'Auction paused';
      if (key === 'auctionGame.playerDisconnected') return 'Player disconnected';
      if (key === 'auctionGame.playerDisconnectedContinueIfNotReturn') return `Continues in ${String(params?.seconds ?? 0)}s`;
      if (key === 'auctionGame.lastReconnect') return 'Last reconnect';
      if (key === 'auctionGame.reconnectsLeftOne') return `${String(params?.count ?? 0)} reconnect left`;
      if (key === 'auctionGame.reconnectsLeftMany') return `${String(params?.count ?? 0)} reconnects left`;
      return key;
    },
  }),
}));

const connectionHealth = vi.hoisted(() => ({
  current: {
    phase: 'connected' as 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'error',
    tier: 'good' as 'unknown' | 'good' | 'unstable' | 'bad',
    connected: true,
    rttMs: 32,
    sampleCount: 3,
    missedPongs: 0,
    lastDisconnectReason: null,
    lastError: null,
    recoveredUntilMs: null,
    updatedAtMs: 0,
  },
}));

vi.mock('@/lib/realtime/connection-health', () => ({
  useRealtimeConnectionHealth: () => connectionHealth.current,
}));

const authSnapshot = vi.hoisted(() => ({
  current: {
    status: 'authenticated' as 'authenticated' | 'anonymous' | 'loading',
    user: { id: 'user-1' } as { id: string } | null,
  },
}));

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: <T,>(selector: (store: typeof authSnapshot.current) => T): T =>
    selector(authSnapshot.current),
}));

const realtimeMock = vi.hoisted(() => ({
  calls: [] as UseRealtimeAuctionMatchParams[],
  cancelSearch: vi.fn(),
  result: null as null | {
    state: {
      phase: string;
      players: Array<{ id: string; isBot: boolean }>;
    } | null;
    humanPlayerId: string | null;
    status?: string;
    error?: string | null;
    versionGapDetected?: boolean;
    search?: {
      phase: 'starting' | 'queued' | 'match_found' | 'cancelled';
      searchId: string | null;
      locale: 'en' | 'ka';
      queuedUserCount: number;
      seatsNeeded: number;
      fallbackAt: string | null;
      fallbackAtMs: number | null;
      queuedPlayers?: Array<{ userId: string; displayName: string }>;
      botCount?: number;
      botPlayers?: Array<{ seatId: string; displayName: string }>;
      matchId?: string | null;
      lineupEndsAtMs?: number | null;
      showdownEndsAtMs?: number | null;
      countdownEndsAtMs?: number | null;
    } | null;
    pause?: {
      matchId: string;
      seatId: string;
      userId: string;
      pauseUntil: string;
      pauseUntilMs: number;
      graceMs: number;
      remainingReconnects: number;
      reason: 'disconnect' | 'reconnect_limit' | 'disconnect_timeout';
    } | null;
    selfForfeited?: boolean;
  },
}));

vi.mock('../realtime/useRealtimeAuctionMatch', () => ({
  useRealtimeAuctionMatch: (params: UseRealtimeAuctionMatchParams) => {
    realtimeMock.calls.push(params);
    if (realtimeMock.result) {
      return {
        actions: {
          startGame: vi.fn(),
          placeBid: vi.fn(),
          fold: vi.fn(),
          confirmReveal: vi.fn(),
          pickSoloOption: vi.fn(),
          setPhase: vi.fn(),
          cancelSearch: realtimeMock.cancelSearch,
        },
        matchId: 'match-1',
        isConnected: true,
        status: 'connected',
        error: null,
        versionGapDetected: false,
        pause: null,
        search: null,
        ...realtimeMock.result,
      };
    }
    return {
      state: null,
      actions: {
        startGame: vi.fn(),
        placeBid: vi.fn(),
        fold: vi.fn(),
        confirmReveal: vi.fn(),
        pickSoloOption: vi.fn(),
        setPhase: vi.fn(),
        cancelSearch: realtimeMock.cancelSearch,
      },
      humanPlayerId: null,
      matchId: null,
      status: params.enabled ? 'searching' : 'auth_required',
      error: null,
      isConnected: params.enabled,
      versionGapDetected: false,
      pause: null,
      search: null,
    };
  },
}));

vi.mock('../components/screens/FormationReveal', () => ({
  FormationReveal: ({
    state,
    onContinue,
  }: {
    state: { formation: { name: string } };
    onContinue: () => void;
  }) => (
    <button type="button" data-testid="formation-start" onClick={onContinue}>
      Start {state.formation.name}
    </button>
  ),
}));

vi.mock('../components/screens/LottieSearch', () => ({
  // Stub the Lottie searching screen (the real one needs a WASM player +
  // IntersectionObserver, unavailable in jsdom). Renders the testable surface.
  LottieSearch: ({
    joined,
    total,
    players,
    botCount,
    botPlayers,
    onCancel,
  }: {
    joined: number;
    total: number;
    players?: Array<{ userId: string; displayName: string }>;
    botCount?: number;
    botPlayers?: Array<{ seatId: string; displayName: string }>;
    onCancel?: () => void;
  }) => (
    <div data-testid="lottie-search">
      <span>Finding players</span>
      <span>
        {joined}/{total} players found
      </span>
      {players?.map((player) => <span key={player.userId}>{player.displayName}</span>)}
      {botPlayers?.map((player) => <span key={player.seatId}>{player.displayName}</span>)}
      {botCount && !botPlayers?.length ? <span>AI bidder</span> : null}
      {onCancel && (
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      )}
    </div>
  ),
}));

vi.mock('../components/AuctionGameScreen', () => ({
  AuctionGameScreen: ({ serverDrivenTransitions }: { serverDrivenTransitions?: boolean }) => (
    <div
      data-testid="auction-game"
      data-server-driven-transitions={String(Boolean(serverDrivenTransitions))}
    />
  ),
}));

vi.mock('../components/AuctionShowdownScreen', () => ({
  AuctionShowdownScreen: () => <div data-testid="auction-showdown" />,
}));

vi.mock('../components/screens/MatchCountdown', () => ({
  MatchCountdown: ({ endsAtMs }: { endsAtMs?: number | null }) => (
    <div data-testid="auction-countdown" data-ends-at={String(endsAtMs ?? '')} />
  ),
}));

vi.mock('../components/AuctionResultsScreen', () => ({
  AuctionResultsScreen: ({
    forfeited,
    removed,
  }: {
    forfeited?: boolean;
    removed?: boolean;
  }) => (
    <div
      data-testid="auction-results"
      data-forfeited={String(Boolean(forfeited))}
      data-removed={String(Boolean(removed))}
    />
  ),
}));

describe('AuctionFlowScreen live mode', () => {
  beforeEach(() => {
    pushMock.mockClear();
    realtimeMock.calls = [];
    realtimeMock.cancelSearch.mockClear();
    realtimeMock.result = null;
    connectionHealth.current = {
      phase: 'connected',
      tier: 'good',
      connected: true,
      rttMs: 32,
      sampleCount: 3,
      missedPongs: 0,
      lastDisconnectReason: null,
      lastError: null,
      recoveredUntilMs: null,
      updatedAtMs: 0,
    };
    authSnapshot.current = {
      status: 'authenticated',
      user: { id: 'user-1' },
    };
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('auto-starts matchmaking immediately (no formation gate before searching)', () => {
    render(<AuctionFlowScreen username="Player" avatarSeed="avatar-1" mode="live" />);

    // No "Start Auction" gate — search begins on mount.
    expect(screen.queryByTestId('formation-start')).not.toBeInTheDocument();
    expect(realtimeMock.calls.at(-1)).toMatchObject({
      enabled: true,
      autoStart: true,
      matchmakingMode: 'search',
      selfUserId: 'user-1',
      locale: 'en',
      formation: '2-2-2',
    });
  });

  it('shows auth-required copy for unauthenticated live Auction users', () => {
    authSnapshot.current = {
      status: 'anonymous',
      user: null,
    };

    render(<AuctionFlowScreen username="Player" avatarSeed="avatar-1" mode="live" />);

    expect(screen.getByText('Auction unavailable')).toBeInTheDocument();
    expect(screen.getByText('Sign in to play Auction.')).toBeInTheDocument();
    expect(realtimeMock.calls.at(-1)).toMatchObject({
      enabled: false,
      matchmakingMode: 'search',
      selfUserId: null,
      formation: '2-2-2',
    });
  });

  it('passes live server-driven transitions and shows reconnect health while in a match', () => {
    realtimeMock.result = {
      state: {
        phase: 'bidding',
        players: [{ id: 'seat-human', isBot: false }],
      },
      humanPlayerId: 'seat-human',
    };
    connectionHealth.current = {
      ...connectionHealth.current,
      phase: 'reconnecting',
      tier: 'bad',
      connected: false,
    };

    render(<AuctionFlowScreen username="Player" avatarSeed="avatar-1" mode="live" />);

    expect(screen.getByTestId('auction-game')).toHaveAttribute('data-server-driven-transitions', 'true');
    expect(screen.getByText('Reconnecting...')).toBeInTheDocument();
  });

  it('renders a rehydrated active match immediately after reload instead of blocking on formation', () => {
    realtimeMock.result = {
      state: {
        phase: 'bidding',
        players: [{ id: 'seat-human', isBot: false }],
      },
      humanPlayerId: 'seat-human',
    };

    render(<AuctionFlowScreen username="Player" avatarSeed="avatar-1" mode="live" />);

    expect(screen.queryByTestId('formation-start')).not.toBeInTheDocument();
    expect(screen.getByTestId('auction-game')).toBeInTheDocument();
    expect(realtimeMock.calls.at(-1)).toMatchObject({
      enabled: true,
      autoStart: true,
      matchmakingMode: 'search',
      selfUserId: 'user-1',
    });
  });

  it('shows live matchmaking queue status and lets the user cancel back to play', () => {
    realtimeMock.result = {
      state: null,
      humanPlayerId: null,
      search: {
        phase: 'queued',
        searchId: 'search-1',
        locale: 'en',
        queuedUserCount: 2,
        seatsNeeded: 1,
        fallbackAt: '2026-06-20T10:00:12.000Z',
        fallbackAtMs: Date.parse('2026-06-20T10:00:12.000Z'),
        queuedPlayers: [
          { userId: 'user-1', displayName: 'Player' },
          { userId: 'user-2', displayName: 'Mobile Rival' },
        ],
        botCount: 0,
      },
    };

    render(<AuctionFlowScreen username="Player" avatarSeed="avatar-1" mode="live" />);

    // Search shows immediately on mount (no formation gate to click through).
    expect(screen.getByText('Finding players')).toBeInTheDocument();
    expect(screen.getByText('2/3 players found')).toBeInTheDocument();
    expect(screen.getByText('Player')).toBeInTheDocument();
    expect(screen.getByText('Mobile Rival')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(realtimeMock.cancelSearch).toHaveBeenCalledTimes(1);
    expect(pushMock).toHaveBeenCalledWith('/play');
  });

  it('keeps all clients on the server-timed lineup, showdown and five-second countdown before play', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000);
    realtimeMock.result = {
      state: {
        phase: 'bidding',
        players: [
          { id: 'seat-human', isBot: false },
          { id: 'seat-human-2', isBot: false },
          { id: 'seat-bot', isBot: true },
        ],
      },
      humanPlayerId: 'seat-human',
      search: {
        phase: 'match_found',
        matchId: 'match-1',
        searchId: 'search-1',
        locale: 'en',
        queuedUserCount: 2,
        seatsNeeded: 1,
        fallbackAt: null,
        fallbackAtMs: null,
        queuedPlayers: [
          { userId: 'user-1', displayName: 'Player' },
          { userId: 'user-2', displayName: 'Mobile Rival' },
        ],
        botCount: 1,
        botPlayers: [{ seatId: 'seat-bot', displayName: 'Goal Goblin' }],
        lineupEndsAtMs: 3_500,
        showdownEndsAtMs: 6_000,
        countdownEndsAtMs: 11_000,
      },
    };

    render(<AuctionFlowScreen username="Player" avatarSeed="avatar-1" mode="live" />);

    expect(screen.getByTestId('lottie-search')).toBeInTheDocument();
    expect(screen.getByText('3/3 players found')).toBeInTheDocument();
    expect(screen.queryByTestId('auction-game')).not.toBeInTheDocument();

    act(() => vi.advanceTimersByTime(2_521));
    expect(screen.getByTestId('auction-showdown')).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(2_500));
    expect(screen.getByTestId('auction-countdown')).toHaveAttribute('data-ends-at', '11000');

    act(() => vi.advanceTimersByTime(5_000));
    expect(screen.getByTestId('auction-game')).toBeInTheDocument();
  });

  it('shows a live pause overlay when the server pauses for a disconnected auction player', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_000);
    realtimeMock.result = {
      state: {
        phase: 'bidding',
        players: [{ id: 'seat-human', isBot: false }],
      },
      humanPlayerId: 'seat-human',
      pause: {
        matchId: 'match-1',
        seatId: 'seat-human-2',
        userId: 'user-2',
        pauseUntil: new Date(31_000).toISOString(),
        pauseUntilMs: 31_000,
        graceMs: 30_000,
        remainingReconnects: 2,
        reason: 'disconnect',
      },
    };

    render(<AuctionFlowScreen username="Player" avatarSeed="avatar-1" mode="live" />);

    expect(screen.getByText('Auction paused')).toBeInTheDocument();
    expect(screen.getByText('Player disconnected')).toBeInTheDocument();
    expect(screen.getByText('Continues in 30s')).toBeInTheDocument();
    expect(screen.getByText('2 reconnects left')).toBeInTheDocument();
  });

  it('shows the removed result after the reconnect grace period expires', () => {
    realtimeMock.result = {
      state: {
        phase: 'bidding',
        players: [{ id: 'seat-human', isBot: false }],
      },
      humanPlayerId: 'seat-human',
      selfForfeited: true,
    };

    render(<AuctionFlowScreen username="Player" avatarSeed="avatar-1" mode="live" />);

    expect(screen.getByTestId('auction-results')).toHaveAttribute('data-forfeited', 'true');
    expect(screen.getByTestId('auction-results')).toHaveAttribute('data-removed', 'true');
    expect(screen.queryByTestId('lottie-search')).not.toBeInTheDocument();
  });
});
