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
      return key;
    },
  }),
}));

const authSnapshot = vi.hoisted(() => ({
  current: {
    status: 'authenticated',
    user: { id: 'user-1' },
  },
}));

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: <T,>(selector: (store: typeof authSnapshot.current) => T): T =>
    selector(authSnapshot.current),
}));

const realtimeMock = vi.hoisted(() => ({
  calls: [] as UseRealtimeAuctionMatchParams[],
}));

vi.mock('../realtime/useRealtimeAuctionMatch', () => ({
  useRealtimeAuctionMatch: (params: UseRealtimeAuctionMatchParams) => {
    realtimeMock.calls.push(params);
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

describe('AuctionFlowScreen live mode', () => {
  beforeEach(() => {
    pushMock.mockClear();
    realtimeMock.calls = [];
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
});
