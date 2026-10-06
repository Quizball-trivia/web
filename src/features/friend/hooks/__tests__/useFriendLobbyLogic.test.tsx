import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useFriendLobbyLogic } from '../useFriendLobbyLogic';
import { useRealtimeMatchStore } from '@/stores/realtimeMatch.store';
import { useAuctionActiveMatchStore } from '@/stores/auctionActiveMatch.store';
import { useFriendDuelHandoffStore } from '@/stores/friendDuelHandoff.store';
import { useFriendRoomHandoffStore } from '@/stores/friendRoomHandoff.store';
import type { LobbyState } from '@/lib/realtime/socket.types';

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
  authUserId: 'user-1' as string,
  openRoomJoins: 0,
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
    const state = { status: 'authenticated', user: { id: mocks.authUserId } };
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
  getSocket: () => ({ emit: mocks.socketEmit, on: () => {}, off: () => {} }),
}));

vi.mock('@/lib/queries/categories.queries', () => ({
  useCategoriesList: () => ({ data: { items: [] } }),
}));

vi.mock('@/lib/queries/stats.queries', () => ({
  useHeadToHead: () => ({ data: null }),
}));

vi.mock('@/lib/analytics/game-events', () => ({
  trackFriendInviteSent: vi.fn(),
  trackFriendInviteRecovery: vi.fn(),
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
      duelGame: null,
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
        if (inviteCode === 'OPEN01' && (mocks.openRoomJoins += 1) === 1) {
          // The room reopened between the server's two lookups: "not found", but it is open now.
          ack({ ok: false, code: 'LOBBY_NOT_FOUND', message: 'Invalid invite code', retryable: false, correlationId,
            room: { roomState: 'open', gameMode: 'auction', duelGame: null, hostNickname: 'Lionel' } });
          return;
        }
        if (inviteCode === 'ACCT01' && mocks.authUserId === 'user-1') {
          ack({ ok: false, code: 'LOBBY_MODE_REQUIRES_ACCOUNT', message: 'needs an account', retryable: false, correlationId,
            room: { roomState: 'open', gameMode: 'friendly_possession', duelGame: null, hostNickname: 'Lionel' } });
          return;
        }
        if (inviteCode === 'SLOW01') {
          // The reply lands after the screen is gone.
          setTimeout(() => ack({
            ok: false,
            code: 'LOBBY_NOT_FOUND',
            message: 'Invalid invite code',
            retryable: false,
            correlationId,
            stateSnapshot: { state: 'IN_WAITING_LOBBY', activeMatchId: null, waitingLobbyId: 'own-lobby', queueSearchId: null, openLobbyIds: ['own-lobby'], resolvedAt: '2026-10-05T00:00:00Z' },
          }), 300);
          return;
        }
        if (inviteCode === 'MINE01' || inviteCode === 'GONE01') {
          // Not found, but the player still has an open room (its own active room, or some other room).
          ack({
            ok: false,
            code: 'LOBBY_NOT_FOUND',
            message: 'Invalid invite code',
            retryable: false,
            correlationId,
            stateSnapshot: { state: 'IN_WAITING_LOBBY', activeMatchId: null, waitingLobbyId: 'own-lobby', queueSearchId: null, openLobbyIds: ['own-lobby'], resolvedAt: '2026-10-05T00:00:00Z' },
          });
          return;
        }
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

  it('a "not found" for a player who still has another open room fails only after the own-room wait, and never after unmount', async () => {
    const { result } = renderHook(() => useFriendLobbyLogic({ roomCode: 'GONE01', isHost: false }));
    await waitFor(() => expect(mocks.socketEmit).toHaveBeenCalledWith('lobby:join_by_code', expect.objectContaining({ inviteCode: 'GONE01' }), expect.any(Function)));
    expect(result.current.inviteJoinFailure).toBeNull();
    await waitFor(() => expect(result.current.inviteJoinFailure).toEqual(expect.objectContaining({ reasonCode: 'LOBBY_NOT_FOUND' })), { timeout: 4000 });

    mocks.toastError.mockClear();
    const second = renderHook(() => useFriendLobbyLogic({ roomCode: 'MINE01', isHost: false }));
    await waitFor(() => expect(mocks.socketEmit).toHaveBeenCalledWith('lobby:join_by_code', expect.objectContaining({ inviteCode: 'MINE01' }), expect.any(Function)));
    second.unmount();
    await new Promise((resolve) => setTimeout(resolve, 3000));
    expect(mocks.toastError).not.toHaveBeenCalled();

    // A reply that arrives after the screen unmounted starts nothing either.
    const third = renderHook(() => useFriendLobbyLogic({ roomCode: 'SLOW01', isHost: false }));
    await waitFor(() => expect(mocks.socketEmit).toHaveBeenCalledWith('lobby:join_by_code', expect.objectContaining({ inviteCode: 'SLOW01' }), expect.any(Function)));
    third.unmount();
    await new Promise((resolve) => setTimeout(resolve, 3300));
    expect(mocks.toastError).not.toHaveBeenCalled();
  }, 20_000);

  it('a room that reopened mid-lookup is joined by one automatic retry (no spinner, no failure)', async () => {
    mocks.openRoomJoins = 0;
    const { result } = renderHook(() => useFriendLobbyLogic({ roomCode: 'OPEN01', isHost: false }));
    await waitFor(() => expect(mocks.openRoomJoins).toBe(2));
    expect(result.current.inviteJoinFailure).toBeNull();
  });

  it('after signing up on a refused invite, the new identity joins again (no stale failure)', async () => {
    mocks.authUserId = 'user-1';
    const { result, rerender } = renderHook(() => useFriendLobbyLogic({ roomCode: 'ACCT01', isHost: false }));
    await waitFor(() => expect(result.current.inviteJoinFailure).toEqual(expect.objectContaining({
      reasonCode: 'LOBBY_MODE_REQUIRES_ACCOUNT', room: expect.objectContaining({ hostNickname: 'Lionel' }),
    })));
    const joinsBefore = mocks.socketEmit.mock.calls.filter(([event]) => event === 'lobby:join_by_code').length;
    // A real sign-in passes through "no identity" while the session loads.
    mocks.authUserId = '';
    rerender();
    mocks.authUserId = 'user-2';
    rerender();
    await waitFor(() => expect(result.current.inviteJoinFailure).toBeNull());
    await waitFor(() => expect(mocks.socketEmit.mock.calls.filter(([event]) => event === 'lobby:join_by_code').length).toBe(joinsBefore + 1));
    mocks.authUserId = 'user-1';
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
        messageKey: 'friend.inviteExpiredReason',
        retryable: false,
        room: null,
      });
    });

    expect(result.current.isResolvingInvite).toBe(false);
    // The full-page screen explains a dead link: no extra toast.
    expect(mocks.toastError).not.toHaveBeenCalled();
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
    // Neither the dead link (explained on screen) nor its stray echo toasts.
    expect(mocks.toastError).not.toHaveBeenCalled();
    expect(result.current.settingsErrorVersion).toBe(0);
  });

  it('ignores a late join failure after navigating to another invite code', async () => {
    let resolveFirstJoin: ((result: unknown) => void) | undefined;
    mocks.socketEmit.mockImplementationOnce((event: string, _payload: unknown, ack?: (result: unknown) => void) => {
      expect(event).toBe('lobby:join_by_code');
      resolveFirstJoin = ack;
    });

    const { result, rerender } = renderHook(
      ({ roomCode }) => useFriendLobbyLogic({ roomCode, isHost: false }),
      { initialProps: { roomCode: 'ROOMA1' } },
    );

    await waitFor(() => expect(resolveFirstJoin).toBeDefined());
    rerender({ roomCode: 'ROOMB2' });

    await waitFor(() => {
      expect(mocks.socketEmit).toHaveBeenCalledWith('lobby:join_by_code', {
        inviteCode: 'ROOMB2',
        correlationId: expect.any(String),
      }, expect.any(Function));
    });

    act(() => {
      resolveFirstJoin?.({
        ok: false,
        code: 'LOBBY_NOT_FOUND',
        message: 'Old lobby no longer exists.',
        retryable: false,
        correlationId: 'stale-request',
      });
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.targetInviteCode).toBe('ROOMB2');
    expect(result.current.inviteJoinFailure).toBeNull();
    expect(mocks.toastError).not.toHaveBeenCalledWith('Old lobby no longer exists.');
    expect(mocks.trackInviteJoinFailed).not.toHaveBeenCalled();
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
      messageKey: 'friend.inviteExpiredReason',
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

  it('still navigates to /auction when the lobby snapshot is cleared before hand-off', async () => {
    // A descriptor already present while the lobby is WAITING is some earlier
    // match — it must be treated as stale, not as the started match.
    act(() => {
      useAuctionActiveMatchStore.getState().setFromRejoinAvailable({
        matchId: 'stale-earlier-match',
      } as Parameters<
        ReturnType<typeof useAuctionActiveMatchStore.getState>['setFromRejoinAvailable']
      >[0]);
      useRealtimeMatchStore.getState().setLobby(makeAuctionLobby('waiting'));
    });

    const { result } = renderHook(() =>
      useFriendLobbyLogic({ roomCode: 'AUCT10', isHost: false }),
    );
    await waitFor(() => {
      expect(result.current.lobby?.inviteCode).toBe('AUCT10');
    });

    // session:state(IN_ACTIVE_MATCH) clears the snapshot before this client
    // observes the active flip. The STALE descriptor alone must not route.
    act(() => {
      useRealtimeMatchStore.setState({ lobby: null });
    });
    expect(mocks.routerPush).not.toHaveBeenCalledWith('/auction');

    // The freshly started match's descriptor lands — now the hand-off fires.
    act(() => {
      useAuctionActiveMatchStore.getState().setFromRejoinAvailable({
        matchId: 'auction-match-cleared-lobby',
      } as Parameters<
        ReturnType<typeof useAuctionActiveMatchStore.getState>['setFromRejoinAvailable']
      >[0]);
    });

    await waitFor(() => {
      expect(mocks.routerPush).toHaveBeenCalledWith('/auction');
    });
    expect(mocks.routerPush).not.toHaveBeenCalledWith('/game');
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

describe('useFriendLobbyLogic duel rooms', () => {
  function duelLobby(status: LobbyState['status'] = 'waiting'): LobbyState {
    const base = makeLobby('DUEL01');
    return {
      ...base,
      status,
      settings: { ...base.settings, gameMode: 'duel', duelGame: 'pistas' },
      members: [
        { ...base.members[0], isReady: true },
        { userId: 'user-2', username: 'Friend', avatarUrl: null, isReady: true, isHost: false },
      ],
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.socketEmit.mockImplementation(() => undefined);
    useRealtimeMatchStore.getState().reset();
    useFriendDuelHandoffStore.setState({ found: null });
  });

  it("hands off to /duelo/<matchId> when this room's duel is found", async () => {
    useRealtimeMatchStore.getState().setLobby(duelLobby());
    const { result } = renderHook(() => useFriendLobbyLogic({ roomCode: 'DUEL01', isHost: true }));
    expect(result.current.isDuelLobby).toBe(true);

    act(() => {
      useFriendDuelHandoffStore.getState().setFound({ matchId: 'duel-1', game: 'pistas', lobbyId: 'lobby-DUEL01' });
    });

    await waitFor(() => expect(mocks.routerPush).toHaveBeenCalledWith('/duelo/duel-1'));
    expect(mocks.routerPush).not.toHaveBeenCalledWith('/game');
    expect(useFriendDuelHandoffStore.getState().found).toBeNull();
  });

  it("ignores another room's duel", async () => {
    useRealtimeMatchStore.getState().setLobby(duelLobby());
    renderHook(() => useFriendLobbyLogic({ roomCode: 'DUEL01', isHost: true }));
    act(() => {
      useFriendDuelHandoffStore.getState().setFound({ matchId: 'duel-9', game: 'pistas', lobbyId: 'lobby-OTHER' });
    });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(mocks.routerPush).not.toHaveBeenCalled();
  });

  it('drops a leftover found from a finished duel when the room is back to waiting', async () => {
    useFriendDuelHandoffStore.setState({
      found: { matchId: 'old-duel', game: 'pistas', lobbyId: 'lobby-DUEL01', receivedAt: Date.now() - 60_000 },
    });
    useRealtimeMatchStore.getState().setLobby(duelLobby('waiting'));
    renderHook(() => useFriendLobbyLogic({ roomCode: 'DUEL01', isHost: true }));
    await waitFor(() => expect(useFriendDuelHandoffStore.getState().found).toBeNull());
    expect(mocks.routerPush).not.toHaveBeenCalled();
  });

  it('follows a found that arrived before the room screen while the duel is live (reconnect)', async () => {
    useFriendDuelHandoffStore.setState({
      found: { matchId: 'live-duel', game: 'pistas', lobbyId: 'lobby-DUEL01', receivedAt: Date.now() - 60_000 },
    });
    useRealtimeMatchStore.getState().setLobby(duelLobby('active'));
    renderHook(() => useFriendLobbyLogic({ roomCode: 'DUEL01', isHost: false }));
    await waitFor(() => expect(mocks.routerPush).toHaveBeenCalledWith('/duelo/live-duel'));
  });

  it('never falls back to /game for a duel room', async () => {
    useRealtimeMatchStore.getState().setLobby(duelLobby('active'));
    useRealtimeMatchStore.setState({ draft: { lobbyId: 'lobby-DUEL01' } as never });
    renderHook(() => useFriendLobbyLogic({ roomCode: 'DUEL01', isHost: true }));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(mocks.routerPush).not.toHaveBeenCalledWith('/game');
  });

  it('sends the duel game with a switch into a duel and drops it when leaving one', () => {
    useRealtimeMatchStore.getState().setLobby(makeLobby('DUEL01'));
    const { result, rerender } = renderHook(() => useFriendLobbyLogic({ roomCode: 'DUEL01', isHost: true }));
    act(() => result.current.actions.handleUpdateSettings({ gameMode: 'duel', duelGame: 'buscaminas' }));
    expect(mocks.socketEmit).toHaveBeenCalledWith('lobby:update_settings', expect.objectContaining({
      lobbyId: 'lobby-DUEL01', gameMode: 'duel', duelGame: 'buscaminas',
    }));

    mocks.socketEmit.mockClear();
    act(() => useRealtimeMatchStore.getState().setLobby(duelLobby()));
    rerender();
    act(() => result.current.actions.handleUpdateSettings({ gameMode: 'auction' }));
    const emitted = mocks.socketEmit.mock.calls.find(([event]) => event === 'lobby:update_settings')?.[1];
    expect(emitted).toMatchObject({ gameMode: 'auction' });
    expect(emitted).not.toHaveProperty('duelGame');
  });

  it('opens /friend/room/new?duel=<game> as a private duel of that game', async () => {
    renderHook(() => useFriendLobbyLogic({ roomCode: 'new', isHost: true, newRoomDuelGame: 'pistas' }));
    await waitFor(() => {
      expect(mocks.socketEmit).toHaveBeenCalledWith('lobby:create', expect.objectContaining({
        mode: 'friendly', isPublic: false, gameMode: 'duel', duelGame: 'pistas',
      }), expect.any(Function));
    });
  });
});

describe('useFriendLobbyLogic room-game rooms', () => {
  function roomLobby(status: 'waiting' | 'active' = 'waiting'): LobbyState {
    const base = makeLobby('ROOM01');
    return {
      ...base,
      status,
      settings: { ...base.settings, gameMode: 'room_game', duelGame: null, roomGame: 'aproximado' },
      members: [
        { ...base.members[0], isReady: true },
        { userId: 'user-2', username: 'Friend', avatarUrl: null, isReady: true, isHost: false },
        { userId: 'user-3', username: 'Third', avatarUrl: null, isReady: true, isHost: false },
      ],
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.socketEmit.mockImplementation(() => undefined);
    useRealtimeMatchStore.getState().reset();
    useFriendRoomHandoffStore.setState({ found: null, sittingOut: null, endedIds: [], answers: 0, lastAnswerLive: false });
  });

  it("hands off to /sala/<matchId> when this room's game starts", async () => {
    useRealtimeMatchStore.getState().setLobby(roomLobby());
    renderHook(() => useFriendLobbyLogic({ roomCode: 'ROOM01', isHost: true }));
    act(() => useFriendRoomHandoffStore.getState().setFound({ matchId: 'room-1', game: 'aproximado', lobbyId: 'lobby-ROOM01' }));
    await waitFor(() => expect(mocks.routerPush).toHaveBeenCalledWith('/sala/room-1'));
    expect(mocks.routerPush).not.toHaveBeenCalledWith('/game');
  });

  it('coming back to the room while its match runs (browser Back) asks the server, and returns to the match', async () => {
    useRealtimeMatchStore.getState().setLobby(roomLobby('active'));
    useFriendRoomHandoffStore.setState({ found: { matchId: 'room-1', game: 'aproximado', lobbyId: 'lobby-ROOM01', receivedAt: Date.now() - 60_000, seq: 0 } });
    renderHook(() => useFriendLobbyLogic({ roomCode: 'ROOM01', isHost: true }));
    expect(mocks.socketEmit).toHaveBeenCalledWith('room:pointer');
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(mocks.routerPush).not.toHaveBeenCalled(); // an old pointer alone is not trusted
    act(() => useFriendRoomHandoffStore.getState().setFound({ matchId: 'room-1', game: 'aproximado', lobbyId: 'lobby-ROOM01' })); // the answer
    await waitFor(() => expect(mocks.routerPush).toHaveBeenCalledWith('/sala/room-1'));
  });

  it('a pointer kept from a match whose end was missed never hijacks the next start', async () => {
    useRealtimeMatchStore.getState().setLobby(roomLobby('waiting'));
    useFriendRoomHandoffStore.setState({ found: { matchId: 'room-old', game: 'aproximado', lobbyId: 'lobby-ROOM01', receivedAt: Date.now() - 60_000, seq: 0 } });
    const { result } = renderHook(() => useFriendLobbyLogic({ roomCode: 'ROOM01', isHost: true }));
    act(() => result.current.actions.handleStartMatch());
    act(() => useRealtimeMatchStore.getState().setLobby(roomLobby('active')));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(mocks.routerPush).not.toHaveBeenCalledWith('/sala/room-old');
    act(() => useFriendRoomHandoffStore.getState().setFound({ matchId: 'room-new', game: 'aproximado', lobbyId: 'lobby-ROOM01' }));
    await waitFor(() => expect(mocks.routerPush).toHaveBeenCalledWith('/sala/room-new'));
  });

  it('a pointer to an earlier room match never routes a reused room that now plays another mode', async () => {
    useRealtimeMatchStore.getState().setLobby({ ...roomLobby('active'), settings: { ...roomLobby().settings, gameMode: 'duel', duelGame: 'pistas', roomGame: null } });
    useFriendRoomHandoffStore.setState({ found: { matchId: 'old-room', game: 'aproximado', lobbyId: 'lobby-ROOM01', receivedAt: Date.now(), seq: 0 } });
    renderHook(() => useFriendLobbyLogic({ roomCode: 'ROOM01', isHost: true }));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(mocks.routerPush).not.toHaveBeenCalledWith('/sala/old-room');
  });

  it('a found that lands while the room still shows its previous mode is kept, re-confirmed once the room game shows, then followed', async () => {
    useRealtimeMatchStore.getState().setLobby({ ...roomLobby(), settings: { ...roomLobby().settings, gameMode: 'friendly_party_quiz', roomGame: null } });
    renderHook(() => useFriendLobbyLogic({ roomCode: 'ROOM01', isHost: true }));
    act(() => useFriendRoomHandoffStore.getState().setFound({ matchId: 'room-2', game: 'aproximado', lobbyId: 'lobby-ROOM01' }));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(useFriendRoomHandoffStore.getState().found).toMatchObject({ matchId: 'room-2' });
    act(() => useRealtimeMatchStore.getState().setLobby(roomLobby('active')));
    await waitFor(() => expect(mocks.socketEmit).toHaveBeenCalledWith('room:pointer'));
    expect(mocks.routerPush).not.toHaveBeenCalled();
    act(() => useFriendRoomHandoffStore.getState().setFound({ matchId: 'room-2', game: 'aproximado', lobbyId: 'lobby-ROOM01' }));
    await waitFor(() => expect(mocks.routerPush).toHaveBeenCalledWith('/sala/room-2'));
  });

  it('an unanswered pointer question is asked again', async () => {
    vi.useFakeTimers();
    useRealtimeMatchStore.getState().setLobby(roomLobby('active'));
    renderHook(() => useFriendLobbyLogic({ roomCode: 'ROOM01', isHost: true }));
    const asks = () => mocks.socketEmit.mock.calls.filter(([event]) => event === 'room:pointer').length;
    expect(asks()).toBe(1);
    act(() => { vi.advanceTimersByTime(1_000); });
    act(() => useRealtimeMatchStore.getState().setLobby(roomLobby('active'))); // an identical update must not cancel it
    act(() => { vi.advanceTimersByTime(2_100); });
    expect(asks()).toBe(2);
    act(() => useFriendRoomHandoffStore.getState().answered(true));
    act(() => { vi.advanceTimersByTime(3_100); });
    expect(asks()).toBe(2);
    vi.useRealTimers();
  });

  it('review 2026-10-06 W4: when every pointer question goes unanswered, the spinner turns into Retry / Leave, and Retry asks again', async () => {
    vi.useFakeTimers();
    try {
    useRealtimeMatchStore.getState().setLobby(roomLobby('active'));
    const { result } = renderHook(() => useFriendLobbyLogic({ roomCode: 'ROOM01', isHost: false }));
    const asks = () => mocks.socketEmit.mock.calls.filter(([event]) => event === 'room:pointer').length;
    expect(result.current.isPreparingMatch).toBe(true);
    expect(result.current.roomHandoffStalled).toBe(false);
    act(() => { vi.advanceTimersByTime(16_000); }); // the whole retry budget, no answer
    expect(asks()).toBe(5);
    expect(result.current.roomHandoffStalled).toBe(true);
    act(() => result.current.actions.handleRoomHandoffRetry());
    expect(asks()).toBe(6);
    expect(result.current.roomHandoffStalled).toBe(false);
    act(() => useFriendRoomHandoffStore.getState().answered(true));
    act(() => { vi.advanceTimersByTime(16_000); });
    expect(result.current.roomHandoffStalled).toBe(false);
    // Round 4 (#7): the way out cannot be lobby:leave (refused while the player still holds a live seat): it goes
    // back to the menu; the unused seat is withdrawn by the match's own absence rules.
    act(() => result.current.actions.handleRoomHandoffExit());
    expect(mocks.routerPush).toHaveBeenCalledWith('/play');
    expect(mocks.socketEmit.mock.calls.filter(([event]) => event === 'lobby:leave')).toHaveLength(0);
    } finally { vi.useRealTimers(); }
  });

  it('"no live seat" for a room still shown as active (a missed end) shows the room with its Leave, not the spinner', async () => {
    useRealtimeMatchStore.getState().setLobby(roomLobby('active'));
    const { result } = renderHook(() => useFriendLobbyLogic({ roomCode: 'ROOM01', isHost: false }));
    expect(result.current.isPreparingMatch).toBe(true);
    act(() => { useFriendRoomHandoffStore.getState().ended(); useFriendRoomHandoffStore.getState().answered(false); });
    await waitFor(() => expect(result.current.isPreparingMatch).toBe(false));
    expect(result.current.isSittingOutRoomGame).toBe(true);
  });

  it('a pointer refreshed just before a missed end is not followed before the server answers', async () => {
    useFriendRoomHandoffStore.getState().setFound({ matchId: 'room-old', game: 'aproximado', lobbyId: 'lobby-ROOM01' }); // 0 s old
    useRealtimeMatchStore.getState().setLobby(roomLobby('waiting'));
    renderHook(() => useFriendLobbyLogic({ roomCode: 'ROOM01', isHost: true }));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(mocks.routerPush).not.toHaveBeenCalled();
    act(() => useFriendRoomHandoffStore.getState().ended()); // the answer: no live seat
    expect(useFriendRoomHandoffStore.getState().found).toBeNull();
  });

  it('a room whose active state arrives late asks again, and follows the confirmed match', async () => {
    useFriendRoomHandoffStore.setState({ found: { matchId: 'room-3', game: 'aproximado', lobbyId: 'lobby-ROOM01', receivedAt: Date.now() - 60_000, seq: 0 } });
    useRealtimeMatchStore.getState().setLobby(roomLobby('waiting'));
    renderHook(() => useFriendLobbyLogic({ roomCode: 'ROOM01', isHost: false }));
    act(() => useRealtimeMatchStore.getState().setLobby(roomLobby('active')));
    await waitFor(() => expect(mocks.socketEmit.mock.calls.filter(([event]) => event === 'room:pointer')).toHaveLength(2));
    act(() => useFriendRoomHandoffStore.getState().setFound({ matchId: 'room-3', game: 'aproximado', lobbyId: 'lobby-ROOM01' }));
    await waitFor(() => expect(mocks.routerPush).toHaveBeenCalledWith('/sala/room-3'));
  });

  it('a late found for a match that already ended is ignored', () => {
    useFriendRoomHandoffStore.getState().ended('room-old');
    useFriendRoomHandoffStore.getState().setFound({ matchId: 'room-old', game: 'aproximado', lobbyId: 'lobby-ROOM01' });
    expect(useFriendRoomHandoffStore.getState().found).toBeNull();
  });

  it("the server's sitting-out word (sent on every connect) sets and clears the marker; an ended match never comes back", () => {
    useFriendRoomHandoffStore.getState().setSittingOut({ matchId: 'room-1', lobbyId: 'lobby-ROOM01' });
    expect(useFriendRoomHandoffStore.getState().sittingOut).toMatchObject({ matchId: 'room-1' });
    useFriendRoomHandoffStore.getState().setSittingOut(null);
    expect(useFriendRoomHandoffStore.getState().sittingOut).toBeNull();
    useFriendRoomHandoffStore.getState().ended('room-1');
    useFriendRoomHandoffStore.getState().setSittingOut({ matchId: 'room-1', lobbyId: 'lobby-ROOM01' });
    expect(useFriendRoomHandoffStore.getState().sittingOut).toBeNull();
  });

  it('a late pointer to the match this player sits out does not send them back into it', async () => {
    useRealtimeMatchStore.getState().setLobby(roomLobby('active'));
    useFriendRoomHandoffStore.getState().setSittingOut({ matchId: 'room-1', lobbyId: 'lobby-ROOM01' });
    renderHook(() => useFriendLobbyLogic({ roomCode: 'ROOM01', isHost: false }));
    act(() => useFriendRoomHandoffStore.getState().setFound({ matchId: 'room-1', game: 'aproximado', lobbyId: 'lobby-ROOM01' }));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(mocks.routerPush).not.toHaveBeenCalledWith('/sala/room-1');
  });

  it('a finished match clears its pointer, so coming back to the room does not route into it', () => {
    useFriendRoomHandoffStore.getState().setFound({ matchId: 'room-1', game: 'aproximado', lobbyId: 'lobby-ROOM01' });
    useFriendRoomHandoffStore.getState().ended('room-1');
    expect(useFriendRoomHandoffStore.getState().found).toBeNull();
  });

  it('"no live seat" on reconnect drops pointers but keeps sitting the running match out; its end clears that too', () => {
    useFriendRoomHandoffStore.getState().setFound({ matchId: 'room-1', game: 'aproximado', lobbyId: 'lobby-ROOM01' });
    useFriendRoomHandoffStore.getState().setSittingOut({ matchId: 'room-1', lobbyId: 'lobby-ROOM01' });
    useFriendRoomHandoffStore.getState().ended();
    expect(useFriendRoomHandoffStore.getState().found).toBeNull();
    expect(useFriendRoomHandoffStore.getState().sittingOut).toMatchObject({ matchId: 'room-1' });
    useFriendRoomHandoffStore.getState().ended('room-1');
    expect(useFriendRoomHandoffStore.getState().sittingOut).toBeNull();
  });

  it('a player sitting the running match out sees the room (not the preparing spinner)', () => {
    useRealtimeMatchStore.getState().setLobby(roomLobby('active'));
    const { result, rerender } = renderHook(() => useFriendLobbyLogic({ roomCode: 'ROOM01', isHost: false }));
    expect(result.current.isPreparingMatch).toBe(true);
    act(() => useFriendRoomHandoffStore.getState().setSittingOut({ matchId: 'room-1', lobbyId: 'lobby-ROOM01' }));
    rerender();
    expect(result.current.isSittingOutRoomGame).toBe(true);
    expect(result.current.isPreparingMatch).toBe(false);
  });

  it('sends the room game with a switch into it and drops it when leaving', () => {
    useRealtimeMatchStore.getState().setLobby(makeLobby('ROOM01'));
    const { result, rerender } = renderHook(() => useFriendLobbyLogic({ roomCode: 'ROOM01', isHost: true }));
    act(() => result.current.actions.handleUpdateSettings({ gameMode: 'room_game' }));
    expect(mocks.socketEmit).toHaveBeenCalledWith('lobby:update_settings', expect.objectContaining({ gameMode: 'room_game', roomGame: 'aproximado' }));
    mocks.socketEmit.mockClear();
    act(() => useRealtimeMatchStore.getState().setLobby(roomLobby()));
    rerender();
    act(() => result.current.actions.handleUpdateSettings({ gameMode: 'auction' }));
    const sent = mocks.socketEmit.mock.calls.find(([event]) => event === 'lobby:update_settings')?.[1] as Record<string, unknown>;
    expect(sent).toMatchObject({ gameMode: 'auction' });
    expect(sent).not.toHaveProperty('roomGame');
  });

  it('a refused switch (game unavailable) rolls the settings back', async () => {
    useRealtimeMatchStore.getState().setLobby(makeLobby('ROOM01'));
    const { result } = renderHook(() => useFriendLobbyLogic({ roomCode: 'ROOM01', isHost: true }));
    act(() => useRealtimeMatchStore.getState().setError({ code: 'ROOM_GAME_UNAVAILABLE', message: 'raw' }));
    await waitFor(() => expect(result.current.settingsErrorVersion).toBe(1));
  });
});

