import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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

  it('waits on the formation screen before enabling the realtime Auction match', () => {
    render(<AuctionFlowScreen username="Player" avatarSeed="avatar-1" mode="live" />);

    expect(screen.getByTestId('formation-start')).toHaveTextContent('Start 4-3-3');
    expect(realtimeMock.calls.at(-1)).toMatchObject({
      enabled: false,
      selfUserId: 'user-1',
      locale: 'en',
      formation: '4-3-3',
    });

    fireEvent.click(screen.getByTestId('formation-start'));

    expect(realtimeMock.calls.at(-1)).toMatchObject({
      enabled: true,
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
    fireEvent.click(screen.getByTestId('formation-start'));

    expect(screen.getByTestId('auction-game')).toHaveAttribute('data-server-driven-transitions', 'true');
    expect(screen.getByText('Reconnecting...')).toBeInTheDocument();
  });
});
