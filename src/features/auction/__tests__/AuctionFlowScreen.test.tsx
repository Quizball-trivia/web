import { fireEvent, render, screen } from '@testing-library/react';
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
  result: null as null | {
    state: {
      phase: string;
      players: Array<{ id: string; isBot: boolean }>;
    };
    humanPlayerId: string | null;
    status?: string;
    error?: string | null;
    versionGapDetected?: boolean;
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
        },
        matchId: 'match-1',
        isConnected: true,
        status: 'connected',
        error: null,
        versionGapDetected: false,
        pause: null,
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
      },
      humanPlayerId: null,
      matchId: null,
      status: params.enabled ? 'searching' : 'auth_required',
      error: null,
      isConnected: params.enabled,
      versionGapDetected: false,
      pause: null,
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

vi.mock('../components/AuctionGameScreen', () => ({
  AuctionGameScreen: ({ serverDrivenTransitions }: { serverDrivenTransitions?: boolean }) => (
    <div
      data-testid="auction-game"
      data-server-driven-transitions={String(Boolean(serverDrivenTransitions))}
    />
  ),
}));

describe('AuctionFlowScreen live mode', () => {
  beforeEach(() => {
    pushMock.mockClear();
    realtimeMock.calls = [];
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
    vi.restoreAllMocks();
  });

  it('waits on the formation screen before auto-starting a new realtime Auction match', () => {
    render(<AuctionFlowScreen username="Player" avatarSeed="avatar-1" mode="live" />);

    expect(screen.getByTestId('formation-start')).toHaveTextContent('Start 4-3-3');
    expect(realtimeMock.calls.at(-1)).toMatchObject({
      enabled: true,
      autoStart: false,
      selfUserId: 'user-1',
      locale: 'en',
      formation: '4-3-3',
    });

    fireEvent.click(screen.getByTestId('formation-start'));

    expect(realtimeMock.calls.at(-1)).toMatchObject({
      enabled: true,
      autoStart: true,
      selfUserId: 'user-1',
      locale: 'en',
      formation: '4-3-3',
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
      selfUserId: null,
      formation: '4-3-3',
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
      autoStart: false,
      selfUserId: 'user-1',
    });
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
});
