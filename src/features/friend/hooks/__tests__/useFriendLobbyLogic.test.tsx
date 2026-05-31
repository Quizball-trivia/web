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
    vi.useRealTimers();
    useRealtimeMatchStore.getState().reset();
  });

  afterEach(() => {
    vi.useRealTimers();
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
      }, expect.any(Function));
    });

    expect(result.current.lobby).toBeNull();
    expect(result.current.members).toEqual([]);
    expect(result.current.lobbyCode).toBe('NAYRR5');
    expect(result.current.isResolvingInvite).toBe(true);
    expect(mocks.startSession).not.toHaveBeenCalled();
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
    vi.useFakeTimers();
    act(() => {
      useRealtimeMatchStore.getState().setLobby(makeLobby('N3K5UZ'));
    });

    const { result } = renderHook(() =>
      useFriendLobbyLogic({ roomCode: 'NAYRR5', isHost: false }),
    );

    expect(mocks.socketEmit).toHaveBeenCalledWith('lobby:join_by_code', {
      inviteCode: 'NAYRR5',
    }, expect.any(Function));

    act(() => {
      result.current.actions.handleLeaveLobby();
      vi.advanceTimersByTime(3000);
    });

    const joinCalls = mocks.socketEmit.mock.calls.filter(([event]) => event === 'lobby:join_by_code');
    expect(joinCalls).toHaveLength(1);
    expect(mocks.socketEmit).toHaveBeenCalledWith('lobby:leave');
    expect(mocks.routerReplace).toHaveBeenCalledWith('/play');
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
