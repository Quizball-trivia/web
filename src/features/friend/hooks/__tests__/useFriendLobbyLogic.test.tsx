import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useFriendLobbyLogic } from '../useFriendLobbyLogic';
import { useRealtimeMatchStore } from '@/stores/realtimeMatch.store';
import type { LobbyState } from '@/lib/realtime/socket.types';

const mocks = vi.hoisted(() => ({
  socketEmit: vi.fn(),
  routerPush: vi.fn(),
  routerReplace: vi.fn(),
  startSession: vi.fn(),
  trackLobbyCreated: vi.fn(),
  trackLobbyJoined: vi.fn(),
  toastError: vi.fn(),
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

describe('useFriendLobbyLogic invite links', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
        code: 'MISSING',
        message: 'Lobby not found.',
      });
    });

    expect(result.current.isResolvingInvite).toBe(false);
    expect(mocks.toastError).toHaveBeenCalledWith('Lobby not found.');
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
