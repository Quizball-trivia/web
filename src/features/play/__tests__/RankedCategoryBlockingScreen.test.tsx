import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RankedCategoryBlockingScreen } from '../RankedCategoryBlockingScreen';

const socket = {
  emit: vi.fn(),
};

function createRealtimeMatchState() {
  return {
    selfUserId: 'u1',
    lobby: {
      lobbyId: 'l1',
      members: [
        {
          userId: 'u1',
          username: 'Player One',
          avatarUrl: null,
          avatarCustomization: { base: 'avatar-player' },
          rankPoints: 1000,
        },
        {
          userId: 'u2',
          username: 'Opponent',
          avatarUrl: null,
          avatarCustomization: { base: 'avatar-opponent' },
          rankPoints: 900,
        },
      ],
    },
    draft: {
      lobbyId: 'l1',
      categories: [
        { id: 'cat-a', name: 'A', icon: null },
        { id: 'cat-b', name: 'B', icon: null },
        { id: 'cat-c', name: 'C', icon: null },
      ],
      bans: {},
      turnUserId: 'u1',
      forceAtMs: (Date.now() + 45_000) as number | null,
      turnAnchorMs: Date.now(),
      halfOneCategoryId: null,
      turnActive: true,
      waitingForReady: null as null | {
        lobbyId: string;
        readyUserIds: string[];
        waitingUserIds: string[];
        forceCancelAt: string;
      },
    },
    draftPaused: false,
    draftPauseUntil: null as number | null,
    match: null,
  };
}

function createRankedMatchmakingState() {
  return {
    rankedFoundOpponent: null,
    rankedFoundMyRecentForm: null,
  };
}

function createGameSessionState() {
  return {
    config: { skipDraftShowdown: true },
  };
}

const realtimeMatchState = createRealtimeMatchState();
const rankedMatchmakingState: {
  rankedFoundOpponent: null | {
    userId: string;
    username: string;
    avatarUrl: string | null;
  };
  rankedFoundMyRecentForm: null;
} = createRankedMatchmakingState();
const gameSessionState = createGameSessionState();

vi.mock('@/lib/realtime/socket-client', () => ({
  getSocket: () => socket,
}));

vi.mock('@/stores/realtimeMatch.store', () => ({
  useRealtimeMatchStore: Object.assign(
    (selector: (state: typeof realtimeMatchState) => unknown) => selector(realtimeMatchState),
    { getState: () => realtimeMatchState },
  ),
}));

vi.mock('@/stores/rankedMatchmaking.store', () => ({
  useRankedMatchmakingStore: Object.assign(
    (selector: (state: typeof rankedMatchmakingState) => unknown) => selector(rankedMatchmakingState),
    { getState: () => rankedMatchmakingState },
  ),
}));

vi.mock('@/stores/gameSession.store', () => ({
  useGameSessionStore: Object.assign(
    (selector: (state: typeof gameSessionState) => unknown) => selector(gameSessionState),
    { getState: () => gameSessionState },
  ),
}));

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: (selector: (state: {
    user: {
      id: string;
      avatar_url: null;
      avatar_customization: { base: string };
      country: string;
      favorite_club: null;
    };
  }) => unknown) => selector({
    user: {
      id: 'u1',
      avatar_url: null,
      avatar_customization: { base: 'avatar-player' },
      country: 'US',
      favorite_club: null,
    },
  }),
}));

vi.mock('@/contexts/PlayerContext', () => ({
  usePlayer: () => ({
    player: {
      username: 'Player One',
      avatar: 'avatar-player',
      avatarCustomization: { base: 'avatar-player' },
      rankPoints: 1000,
      level: 3,
    },
  }),
}));

vi.mock('@/contexts/LocaleContext', () => ({
  useLocale: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/lib/queries/ranked.queries', () => ({
  useRankedProfile: () => ({ data: { rp: 1000 } }),
}));

vi.mock('@/lib/avatars', () => ({
  resolveAvatarUrl: (value: string | null | undefined) => value ?? 'avatar-fallback',
}));

vi.mock('@/lib/sounds/gameSounds', () => ({
  isMuted: () => true,
  toggleMute: () => false,
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/components/AvatarDisplay', () => ({
  AvatarDisplay: () => <div data-testid="avatar" />,
}));

vi.mock('@/components/shared/BanCategoryCard', () => ({
  BanCategoryCard: (props: { category: { name: string }; disabled: boolean }) => (
    <button type="button" disabled={props.disabled}>{props.category.name}</button>
  ),
}));

vi.mock('@/components/ShowdownScreen', () => ({
  ShowdownScreen: () => <div>Showdown</div>,
}));

vi.mock('@/components/shared/LoadingScreen', () => ({
  LoadingScreen: () => <div>Loading</div>,
}));

describe('RankedCategoryBlockingScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(realtimeMatchState, createRealtimeMatchState());
    Object.assign(rankedMatchmakingState, createRankedMatchmakingState());
    Object.assign(gameSessionState, createGameSessionState());
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callback(0);
      return 1;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);
  });

  it('rejoins the draft without owning the ui-ready gate acknowledgement', () => {
    render(<RankedCategoryBlockingScreen />);

    expect(socket.emit).toHaveBeenCalledWith('draft:rejoin', { lobbyId: 'l1' });
    expect(socket.emit.mock.calls.filter(([eventName]) => eventName === 'draft:ui_ready')).toHaveLength(0);
  });

  it('renders 15 seconds from the authoritative 16-second human turn deadline', () => {
    realtimeMatchState.draft.forceAtMs = Date.now() + 16_000;
    realtimeMatchState.draft.turnAnchorMs = Date.now();

    render(<RankedCategoryBlockingScreen />);

    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.queryByText('16')).not.toBeInTheDocument();
  });

  it('does not make the showdown responsible for draft:ui_ready', () => {
    gameSessionState.config.skipDraftShowdown = false;
    rankedMatchmakingState.rankedFoundOpponent = {
      userId: 'u2',
      username: 'Opponent',
      avatarUrl: null,
    };

    render(<RankedCategoryBlockingScreen />);

    expect(socket.emit.mock.calls.filter(([eventName]) => eventName === 'draft:ui_ready')).toHaveLength(0);
  });

  it('promises cancellation and a ticket refund when the draft is paused', () => {
    realtimeMatchState.draftPaused = true;
    realtimeMatchState.draftPauseUntil = Date.now() + 8_000;

    render(<RankedCategoryBlockingScreen />);

    expect(screen.getByText('possession.opponentDisconnectedCancelIfNotReturn')).toBeInTheDocument();
    expect(screen.queryByText('possession.opponentDisconnectedWinIfNotReturn')).not.toBeInTheDocument();
  });

  it('shows a live opponent ready-gate countdown and disables banning', () => {
    realtimeMatchState.draft.turnActive = false;
    realtimeMatchState.draft.forceAtMs = null;
    realtimeMatchState.draft.waitingForReady = {
      lobbyId: 'l1',
      readyUserIds: ['u1'],
      waitingUserIds: ['u2'],
      forceCancelAt: new Date(Date.now() + 8_000).toISOString(),
    };

    render(<RankedCategoryBlockingScreen />);

    expect(screen.getByText('banCategory.opponentConnecting')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'A' })).toBeDisabled();
    expect(screen.queryByText('possession.halftime.yourTurn')).not.toBeInTheDocument();
  });

  it('shows a gate countdown when only self is waiting', () => {
    realtimeMatchState.draft.turnActive = false;
    realtimeMatchState.draft.forceAtMs = null;
    realtimeMatchState.draft.waitingForReady = {
      lobbyId: 'l1',
      readyUserIds: ['u2'],
      waitingUserIds: ['u1'],
      forceCancelAt: new Date(Date.now() + 8_000).toISOString(),
    };

    render(<RankedCategoryBlockingScreen />);

    expect(screen.getByText('banCategory.connecting')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
  });
});
