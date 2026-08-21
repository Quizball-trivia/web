import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useFriendLobbyLogic } from '../useFriendLobbyLogic';
import { useRealtimeMatchStore } from '@/stores/realtimeMatch.store';
import { useAuctionActiveMatchStore } from '@/stores/auctionActiveMatch.store';
import { useFootballGridStore } from '@/stores/footballGrid.store';
import type { FootballGridState, LobbyState } from '@/lib/realtime/socket.types';

const mocks = vi.hoisted(() => ({
  socketEmit: vi.fn(),
  routerPush: vi.fn(),
  routerReplace: vi.fn(),
  startSession: vi.fn(),
  trackLobbyCreated: vi.fn(),
  trackLobbyJoined: vi.fn(),
  trackInviteLinkOpened: vi.fn(),
  trackInviteJoinAttempted: vi.fn(),
  trackInviteJoinFailed: vi.fn(),
  trackInviteJoinSucceeded: vi.fn(),
  toastError: vi.fn(),
  retryFailureJoinCount: 0,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mocks.routerPush,
    replace: mocks.routerReplace,
  }),
}));

vi.mock('@/contexts/PlayerContext', () => ({
  usePlayer: () => ({ player: { id: 'user-1' } }),
}));

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: (selector?: (state: { user: { id: string } }) => unknown) => {
    const state = { user: { id: 'user-1' } };
    return selector ? selector(state) : state;
  },
}));

vi.mock('@/stores/gameSession.store', () => ({
  useGameSessionStore: (selector?: (state: { startSession: typeof mocks.startSession }) => unknown) => {
    const state = { startSession: mocks.startSession };
    return selector ? selector(state) : state;
  },
}));

vi.mock('@/lib/realtime/useRealtimeConnection', () => ({
  useRealtimeConnection: () => undefined,
}));

vi.mock('@/lib/realtime/socket-client', () => ({
  connectSocket: () => ({ emit: mocks.socketEmit }),
  getSocket: () => ({ emit: mocks.socketEmit }),
}));

vi.mock('@/lib/queries/categories.queries', () => ({
  useCategoriesList: () => ({ data: { items: [] } }),
}));

vi.mock('@/lib/queries/stats.queries', () => ({
  useHeadToHead: () => ({ data: null }),
}));

vi.mock('@/lib/analytics/game-events', () => ({
  trackFriendInviteSent: vi.fn(),
  trackFriendInviteLinkOpened: (...args: unknown[]) => mocks.trackInviteLinkOpened(...args),
  trackFriendInviteJoinAttempted: (...args: unknown[]) => mocks.trackInviteJoinAttempted(...args),
  trackFriendInviteJoinFailed: (...args: unknown[]) => mocks.trackInviteJoinFailed(...args),
  trackFriendInviteJoinSucceeded: (...args: unknown[]) => mocks.trackInviteJoinSucceeded(...args),
  trackLobbyCreated: (...args: unknown[]) => mocks.trackLobbyCreated(...args),
  trackLobbyJoined: (...args: unknown[]) => mocks.trackLobbyJoined(...args),
}));

vi.mock('@/utils/clipboard', () => ({
  copyToClipboard: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    error: mocks.toastError,
    info: vi.fn(),
    success: vi.fn(),
  },
}));

function makeLobby(inviteCode: string): LobbyState {
  return {
    lobbyId: `lobby-${inviteCode}`,
    mode: 'friendly',
    status: 'waiting',
    inviteCode,
    displayName: 'Test Lobby',
    isPublic: false,
    hostUserId: 'user-1',
    settings: {
      gameMode: 'friendly_possession',
      friendlyRandom: true,
      friendlyCategoryAId: null,
      friendlyCategoryBId: null,
    },
    members: [
      {
        userId: 'user-1',
        username: 'Me',
        avatarUrl: null,
        isReady: false,
        isHost: true,
      },
    ],
  };
}

function makeFootballGridState(overrides: Partial<FootballGridState> = {}): FootballGridState {
  const criterion = (id: string) => ({
    id,
    key: id,
    family: 'club' as const,
    labelEn: id,
    labelKa: id,
    assetKey: null,
    difficulty: 'normal' as const,
  });
  return {
    matchId: 'grid-match-1',
    status: 'handoff',
    phase: 'handoff',
    board: {
      boardId: 'grid-board-1',
      boardVersion: 1,
      checksum: 'checksum',
      rows: [criterion('r1'), criterion('r2'), criterion('r3')],
      columns: [criterion('c1'), criterion('c2'), criterion('c3')],
    },
    players: [
      { userId: 'user-1', seat: 1, isBot: false, handoffAcknowledged: false, ready: false, noActionTimeouts: 0, pauseBudgetRemainingMs: 30_000 },
      { userId: 'user-2', seat: 2, isBot: false, handoffAcknowledged: false, ready: false, noActionTimeouts: 0, pauseBudgetRemainingMs: 30_000 },
    ],
    openerUserId: 'user-1',
    currentPlayerUserId: null,
    winnerUserId: null,
    turnNumber: 0,
    stateVersion: 1,
    claims: [],
    phaseDeadlineAt: new Date(Date.now() + 10_000).toISOString(),
    turnDeadlineAt: null,
    turnRemainingMs: null,
    pausedAt: null,
    pausedFromPhase: null,
    reconnectDeadlineAt: null,
    completionReason: null,
    ...overrides,
  };
}

describe('useFriendLobbyLogic invite links', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.retryFailureJoinCount = 0;
    mocks.socketEmit.mockImplementation((event: string, payload?: unknown, ack?: (result: unknown) => void) => {
      if (typeof ack !== 'function') return;
      const correlationId =
        payload && typeof payload === 'object' && 'correlationId' in payload
          ? String((payload as { correlationId: unknown }).correlationId)
          : 'test-correlation';
      if (event === 'lobby:create') {
        ack({
          ok: true,
          lobbyId: 'created-lobby',
          inviteCode: 'CRE8ED',
          correlationId,
        });
      }
      if (event === 'lobby:join_by_code') {
        const inviteCode =
          payload && typeof payload === 'object' && 'inviteCode' in payload
            ? String((payload as { inviteCode: unknown }).inviteCode)
            : 'JOINED';
        if (inviteCode === 'MISSING') {
          ack({
            ok: false,
            code: 'LOBBY_NOT_FOUND',
            message: 'Lobby not found.',
            retryable: false,
            correlationId,
          });
          return;
        }
        if (inviteCode === 'FLAKY1') {
          mocks.retryFailureJoinCount += 1;
          if (mocks.retryFailureJoinCount > 1) {
            ack({
              ok: false,
              code: 'LOBBY_NOT_FOUND',
              message: 'Lobby closed during retry.',
              retryable: false,
              correlationId,
            });
            return;
          }
        }
        ack({
          ok: true,
          lobbyId: 'joined-lobby',
          inviteCode,
          alreadyMember: false,
          correlationId,
        });
      }
      if (event === 'lobby:leave') {
        ack({
          ok: true,
          lobbyId: 'left-lobby',
          closed: false,
          correlationId,
        });
      }
    });
    vi.useRealTimers();
    useRealtimeMatchStore.getState().reset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('joins a concrete invite code instead of creating a lobby even if host query state is present', async () => {
    renderHook(() =>
      useFriendLobbyLogic({ roomCode: 'NAYRR5', isHost: true }),
    );

    await waitFor(() => {
      expect(mocks.socketEmit).toHaveBeenCalledWith('lobby:join_by_code', {
        inviteCode: 'NAYRR5',
        correlationId: expect.any(String),
      }, expect.any(Function));
    });

    expect(mocks.socketEmit).not.toHaveBeenCalledWith('lobby:create', expect.objectContaining({ mode: 'friendly' }), expect.any(Function));
  });

  it('creates a lobby only for the new-room route', async () => {
    renderHook(() =>
      useFriendLobbyLogic({ roomCode: 'new', isHost: true }),
    );

    expect(mocks.socketEmit).toHaveBeenCalledWith('lobby:create', {
      mode: 'friendly',
      correlationId: expect.any(String),
    }, expect.any(Function));
    expect(mocks.socketEmit).not.toHaveBeenCalledWith('lobby:join_by_code', expect.anything(), expect.any(Function));
  });

  it('does not expose a stale lobby when the URL invite code points to another room', async () => {
    act(() => {
      useRealtimeMatchStore.getState().setLobby(makeLobby('N3K5UZ'));
    });

    const { result } = renderHook(() =>
      useFriendLobbyLogic({ roomCode: 'NAYRR5', isHost: false }),
    );

    await waitFor(() => {
      expect(mocks.socketEmit).toHaveBeenCalledWith('lobby:join_by_code', {
        inviteCode: 'NAYRR5',
        correlationId: expect.any(String),
      }, expect.any(Function));
    });

    expect(result.current.lobby).toBeNull();
    expect(result.current.members).toEqual([]);
    expect(result.current.lobbyCode).toBe('NAYRR5');
    expect(result.current.isResolvingInvite).toBe(true);
    expect(mocks.startSession).not.toHaveBeenCalled();
  });

  it('stops resolving and exposes a terminal invite failure when the lobby is gone', async () => {
    const { result } = renderHook(() =>
      useFriendLobbyLogic({ roomCode: 'MISSING', isHost: false }),
    );

    await waitFor(() => {
      expect(mocks.socketEmit).toHaveBeenCalledWith('lobby:join_by_code', {
        inviteCode: 'MISSING',
        correlationId: expect.any(String),
      }, expect.any(Function));
    });

    await waitFor(() => {
      expect(result.current.inviteJoinFailure).toEqual({
        inviteCode: 'MISSING',
        reasonCode: 'LOBBY_NOT_FOUND',
        message: 'This link can’t be used anymore.',
        retryable: false,
      });
    });

    expect(result.current.isResolvingInvite).toBe(false);
    expect(mocks.toastError).toHaveBeenCalledWith('This link can’t be used anymore.');
    expect(mocks.trackInviteLinkOpened).toHaveBeenCalledTimes(1);
    expect(mocks.trackInviteJoinAttempted).toHaveBeenCalledWith({
      attemptNumber: 1,
    });
    expect(mocks.trackInviteJoinFailed).toHaveBeenCalledWith(expect.objectContaining({
      failureCode: 'LOBBY_NOT_FOUND',
      attemptNumber: 1,
    }));

    act(() => {
      useRealtimeMatchStore.getState().setError({
        code: 'LOBBY_NOT_FOUND',
        message: 'Raw backend error.',
      });
    });

    await waitFor(() => {
      expect(useRealtimeMatchStore.getState().error).toBeNull();
    });
    expect(mocks.toastError).toHaveBeenCalledTimes(1);
    expect(result.current.settingsErrorVersion).toBe(0);
  });

  it('retries an acknowledged invite when lobby state is not delivered', async () => {
    vi.useFakeTimers();
    renderHook(() =>
      useFriendLobbyLogic({ roomCode: 'STATE1', isHost: false }),
    );

    await act(async () => {
      await Promise.resolve();
    });
    expect(mocks.socketEmit.mock.calls.filter(([event]) => event === 'lobby:join_by_code')).toHaveLength(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(4_000);
    });

    expect(mocks.socketEmit.mock.calls.filter(([event]) => event === 'lobby:join_by_code')).toHaveLength(2);
    expect(mocks.trackInviteJoinAttempted).toHaveBeenLastCalledWith({
      attemptNumber: 2,
    });
  });

  it('accepts authoritative lobby state that arrives just after the terminal timeout', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() =>
      useFriendLobbyLogic({ roomCode: 'LATE01', isHost: false }),
    );

    await act(async () => {
      await Promise.resolve();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4_000);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4_000);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4_000);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4_000);
    });

    expect(result.current.inviteJoinFailure?.reasonCode).toBe('LOBBY_STATE_TIMEOUT');

    act(() => {
      useRealtimeMatchStore.getState().setLobby(makeLobby('LATE01'));
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.inviteJoinFailure).toBeNull();
    expect(mocks.trackInviteJoinSucceeded).toHaveBeenCalledWith({
      lobbyId: 'lobby-LATE01',
      attemptNumber: 3,
    });
  });

  it('keeps a retry command failure from being overwritten by the confirmation timeout', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() =>
      useFriendLobbyLogic({ roomCode: 'FLAKY1', isHost: false }),
    );

    await act(async () => {
      await Promise.resolve();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4_000);
    });

    expect(result.current.inviteJoinFailure).toEqual(expect.objectContaining({
      reasonCode: 'LOBBY_NOT_FOUND',
      message: 'This link can’t be used anymore.',
      retryable: false,
    }));
    expect(mocks.trackInviteJoinFailed).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(8_000);
    });

    expect(result.current.inviteJoinFailure?.reasonCode).toBe('LOBBY_NOT_FOUND');
    expect(mocks.trackInviteJoinFailed).toHaveBeenCalledTimes(1);
  });

  it('does not label internal room navigation as a shared-link funnel', async () => {
    renderHook(() =>
      useFriendLobbyLogic({ roomCode: 'MANUAL1', isHost: false, inviteSource: 'manual_code' }),
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(mocks.trackInviteLinkOpened).not.toHaveBeenCalled();
    expect(mocks.trackInviteJoinAttempted).not.toHaveBeenCalled();
    expect(mocks.trackInviteJoinFailed).not.toHaveBeenCalled();
    expect(mocks.trackInviteJoinSucceeded).not.toHaveBeenCalled();
  });

  it('does not try to rejoin the invite while the lobby is handing off to an active match', async () => {
    act(() => {
      useRealtimeMatchStore.getState().setSessionState({
        state: 'IN_ACTIVE_MATCH',
        activeMatchId: 'match-1',
        waitingLobbyId: null,
        queueSearchId: null,
        openLobbyIds: [],
        resolvedAt: new Date().toISOString(),
      });
    });

    const { result } = renderHook(() =>
      useFriendLobbyLogic({ roomCode: 'NAYRR5', isHost: true }),
    );

    await Promise.resolve();

    expect(result.current.isPreparingMatch).toBe(true);
    expect(result.current.isResolvingInvite).toBe(false);
    expect(result.current.inviteJoinFailure).toBeNull();
    expect(mocks.socketEmit).not.toHaveBeenCalledWith('lobby:join_by_code', expect.anything(), expect.any(Function));
  });

  it('does not spam invite joins or toasts on transient transition locks', async () => {
    act(() => {
      useRealtimeMatchStore.getState().setLobby(makeLobby('N3K5UZ'));
    });

    renderHook(() =>
      useFriendLobbyLogic({ roomCode: 'NAYRR5', isHost: false }),
    );

    await waitFor(() => {
      expect(mocks.socketEmit).toHaveBeenCalledWith('lobby:join_by_code', {
        inviteCode: 'NAYRR5',
        correlationId: expect.any(String),
      }, expect.any(Function));
    });

    act(() => {
      for (let index = 0; index < 5; index += 1) {
        useRealtimeMatchStore.getState().setError({
          code: 'TRANSITION_IN_PROGRESS',
          message: 'Lobby state transition is in progress. Please retry.',
        });
      }
    });

    await Promise.resolve();

    const joinCalls = mocks.socketEmit.mock.calls.filter(([event]) => event === 'lobby:join_by_code');
    expect(joinCalls).toHaveLength(1);
    expect(mocks.toastError).not.toHaveBeenCalled();
  });

  it('cancels pending invite retries when the user leaves from the resolving state', async () => {
    act(() => {
      useRealtimeMatchStore.getState().setLobby(makeLobby('N3K5UZ'));
    });

    const { result } = renderHook(() =>
      useFriendLobbyLogic({ roomCode: 'NAYRR5', isHost: false }),
    );

    expect(mocks.socketEmit).toHaveBeenCalledWith('lobby:join_by_code', {
      inviteCode: 'NAYRR5',
      correlationId: expect.any(String),
    }, expect.any(Function));

    await act(async () => {
      result.current.actions.handleLeaveLobby();
    });

    const joinCalls = mocks.socketEmit.mock.calls.filter(([event]) => event === 'lobby:join_by_code');
    expect(joinCalls).toHaveLength(1);
    expect(mocks.socketEmit).toHaveBeenCalledWith('lobby:leave', {
      correlationId: expect.any(String),
    }, expect.any(Function));
    await waitFor(() => {
      expect(mocks.routerReplace).toHaveBeenCalledWith('/play');
    });
  });

  it('exposes the lobby only after it matches the URL invite code', async () => {
    act(() => {
      useRealtimeMatchStore.getState().setLobby(makeLobby('NAYRR5'));
    });

    const { result } = renderHook(() =>
      useFriendLobbyLogic({ roomCode: 'NAYRR5', isHost: false }),
    );

    await waitFor(() => {
      expect(result.current.lobby?.inviteCode).toBe('NAYRR5');
    });

    expect(result.current.isResolvingInvite).toBe(false);
    expect(mocks.socketEmit).not.toHaveBeenCalledWith('lobby:join_by_code', {
      inviteCode: 'NAYRR5',
      correlationId: expect.any(String),
    }, expect.any(Function));
    await waitFor(() => {
      expect(mocks.startSession).toHaveBeenCalledWith({
        mode: 'quizball',
        matchType: 'friendly',
        questionCount: 10,
      });
    });
  });
});

describe('useFriendLobbyLogic auction hand-off', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    useRealtimeMatchStore.getState().reset();
    useAuctionActiveMatchStore.getState().clear();
  });

  function makeAuctionLobby(status: LobbyState['status'] = 'active'): LobbyState {
    const lobby = makeLobby('AUCT10');
    return {
      ...lobby,
      status,
      settings: { ...lobby.settings, gameMode: 'auction' },
    };
  }

  it('navigates to /auction once an auction lobby match exists', async () => {
    act(() => {
      useRealtimeMatchStore.getState().setLobby(makeAuctionLobby('active'));
      useAuctionActiveMatchStore.getState().setFromRejoinAvailable({
        matchId: 'auction-match-1',
      } as Parameters<
        ReturnType<typeof useAuctionActiveMatchStore.getState>['setFromRejoinAvailable']
      >[0]);
    });

    renderHook(() => useFriendLobbyLogic({ roomCode: 'AUCT10', isHost: true }));

    await waitFor(() => {
      expect(mocks.routerPush).toHaveBeenCalledWith('/auction');
    });
    expect(mocks.routerPush).not.toHaveBeenCalledWith('/game');
  });

  it('stays put while the auction lobby is still waiting', async () => {
    act(() => {
      useRealtimeMatchStore.getState().setLobby(makeAuctionLobby('waiting'));
      useAuctionActiveMatchStore.getState().setFromRejoinAvailable({
        matchId: 'stale-auction-match',
      } as Parameters<
        ReturnType<typeof useAuctionActiveMatchStore.getState>['setFromRejoinAvailable']
      >[0]);
    });

    const { result } = renderHook(() =>
      useFriendLobbyLogic({ roomCode: 'AUCT10', isHost: true }),
    );

    await waitFor(() => {
      expect(result.current.isAuctionLobby).toBe(true);
    });
    expect(mocks.routerPush).not.toHaveBeenCalledWith('/auction');
  });

  it('routes a non-auction lobby to /game, not /auction', async () => {
    act(() => {
      useRealtimeMatchStore.getState().setLobby(makeLobby('NAYRR5'));
    });

    renderHook(() => useFriendLobbyLogic({ roomCode: 'NAYRR5', isHost: true }));

    act(() => {
      useRealtimeMatchStore.getState().setDraftStart({
        lobbyId: 'lobby-NAYRR5',
        categories: [],
        turnUserId: 'user-1',
      } as Parameters<ReturnType<typeof useRealtimeMatchStore.getState>['setDraftStart']>[0]);
    });

    await waitFor(() => {
      expect(mocks.routerPush).toHaveBeenCalledWith('/game');
    });
    expect(mocks.routerPush).not.toHaveBeenCalledWith('/auction');
  });
});

describe('useFriendLobbyLogic Football Grid hand-off', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    useRealtimeMatchStore.getState().reset();
    useFootballGridStore.getState().clear();
  });

  it('navigates both friend-lobby players to the live Grid route', async () => {
    const lobby = makeLobby('GRID10');
    act(() => {
      useRealtimeMatchStore.getState().setLobby({
        ...lobby,
        status: 'active',
        settings: { ...lobby.settings, gameMode: 'football_grid' },
        members: [
          ...lobby.members,
          { userId: 'user-2', username: 'Rival', avatarUrl: null, isReady: true, isHost: false },
        ],
      });
      useFootballGridStore.setState({
        state: makeFootballGridState(),
      });
    });

    const { result } = renderHook(() => useFriendLobbyLogic({ roomCode: 'GRID10', isHost: true }));

    await waitFor(() => {
      expect(result.current.isFootballGridLobby).toBe(true);
      expect(mocks.routerPush).toHaveBeenCalledWith('/tic-tac-toe?source=friend_lobby');
    });
    expect(mocks.routerPush).not.toHaveBeenCalledWith('/game');
  });

  it('does not route a new lobby using terminal state from an earlier Grid match', async () => {
    const lobby = makeLobby('GRID20');
    act(() => {
      useRealtimeMatchStore.getState().setLobby({
        ...lobby,
        status: 'active',
        settings: { ...lobby.settings, gameMode: 'football_grid' },
      });
      useFootballGridStore.setState({
        state: makeFootballGridState({
          matchId: 'old-grid-match',
          status: 'completed',
          phase: 'terminal',
          stateVersion: 12,
          completionReason: 'board_full',
        }),
      });
    });

    const { result } = renderHook(() => useFriendLobbyLogic({ roomCode: 'GRID20', isHost: true }));
    await waitFor(() => expect(result.current.isFootballGridLobby).toBe(true));
    expect(mocks.routerPush).not.toHaveBeenCalledWith('/football-grid?source=friend_lobby');
  });
});
