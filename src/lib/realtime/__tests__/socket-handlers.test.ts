import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { queryKeys } from '@/lib/queries/queryKeys';
import { useRealtimeMatchStore } from '@/stores/realtimeMatch.store';
import { __setSocketOverride } from '../socket-client';
import type { Socket } from 'socket.io-client';
import type { ServerToClientEvents, ClientToServerEvents } from '../socket.types';

const getMeMock = vi.fn().mockResolvedValue({ id: 'self-1' });
const authState = {
  user: { id: 'self-1' },
  setAuthenticated: vi.fn(),
};

vi.mock('@/lib/api/endpoints', () => ({
  getMe: (...args: unknown[]) => getMeMock(...args),
}));

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: {
    getState: () => authState,
  },
}));

import { registerSocketHandlers, resetSocketHandlers } from '../socket-handlers';

// ---------------------------------------------------------------------------
// Minimal mock socket that tracks .on() listeners so we can fire them
// ---------------------------------------------------------------------------
type EventMap = ServerToClientEvents;

function createMockSocket() {
  const listeners = new Map<string, Set<(...args: unknown[]) => void>>();

  const socket = {
    connected: true,
    id: 'mock-socket-id',
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)!.add(handler);
      return socket;
    }),
    off: vi.fn((event: string, handler?: (...args: unknown[]) => void) => {
      if (handler) {
        listeners.get(event)?.delete(handler);
      } else {
        listeners.delete(event);
      }
      return socket;
    }),
    emit: vi.fn(),
  } as unknown as Socket<ServerToClientEvents, ClientToServerEvents>;

  function fire<K extends keyof EventMap>(event: K, ...args: Parameters<EventMap[K]>) {
    const handlers = listeners.get(event as string);
    if (handlers) {
      for (const handler of handlers) {
        handler(...args);
      }
    }
  }

  return { socket, fire };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('registerSocketHandlers', () => {
  let mockSocket: ReturnType<typeof createMockSocket>;

  beforeEach(() => {
    // Reset store to clean state
    useRealtimeMatchStore.getState().reset();
    useRealtimeMatchStore.setState({ selfUserId: null });
    getMeMock.mockClear();
    authState.setAuthenticated.mockClear();

    // Reset handler registration so each test gets fresh handlers
    resetSocketHandlers();

    // Create fresh mock socket and install as override
    mockSocket = createMockSocket();
    __setSocketOverride(mockSocket.socket);
  });

  afterEach(() => {
    __setSocketOverride(null);
  });

  // Regression: the error handler must read selfUserId fresh via getState(),
  // not from a stale snapshot captured at registration time.
  it('reads fresh selfUserId when reverting draft ban on BAN_FAILED error', () => {
    // 1. Register handlers — at this point selfUserId is null
    registerSocketHandlers();

    // 2. Seed a draft so revertDraftBan has something to operate on
    useRealtimeMatchStore.getState().setDraftStart({
      lobbyId: 'lobby-1',
      categories: [
        { id: 'cat-1', name: 'Science', icon: '🔬' },
        { id: 'cat-2', name: 'History', icon: '📜' },
      ],
      turnUserId: 'user-123',
    });
    // Simulate the user banning a category
    useRealtimeMatchStore.getState().setDraftBan('user-123', 'cat-1');

    // 3. Set selfUserId AFTER registration (simulates late identification)
    useRealtimeMatchStore.setState({ selfUserId: 'user-123' });

    // 4. Fire a BAN_FAILED error
    mockSocket.fire('error', {
      code: 'BAN_FAILED',
      message: 'Ban failed',
      meta: {},
    });

    // 5. The draft ban for user-123 should have been reverted.
    //    revertDraftBan removes the user's ban and sets turnUserId back to them.
    const draft = useRealtimeMatchStore.getState().draft;
    expect(draft).not.toBeNull();
    expect(draft!.bans).not.toHaveProperty('user-123');
    expect(draft!.turnUserId).toBe('user-123');
  });

  it('does NOT revert draft ban when selfUserId is still null', () => {
    // Register handlers — selfUserId is null
    registerSocketHandlers();

    // Seed a draft with a ban
    useRealtimeMatchStore.getState().setDraftStart({
      lobbyId: 'lobby-1',
      categories: [
        { id: 'cat-1', name: 'Science', icon: '🔬' },
        { id: 'cat-2', name: 'History', icon: '📜' },
      ],
      turnUserId: 'user-456',
    });
    useRealtimeMatchStore.getState().setDraftBan('user-456', 'cat-1');

    // Do NOT set selfUserId — it remains null

    // Fire BAN_FAILED
    mockSocket.fire('error', {
      code: 'BAN_FAILED',
      message: 'Ban failed',
      meta: {},
    });

    // Ban should NOT have been reverted (no selfUserId to revert for)
    const draft = useRealtimeMatchStore.getState().draft;
    expect(draft).not.toBeNull();
    expect(draft!.bans).toHaveProperty('user-456');
  });

  it('patches ranked profile cache from match:final_results when rankedOutcome exists for self', () => {
    const profileKey = queryKeys.ranked.profile();
    let cachedProfile: Record<string, unknown> = {
      rp: 7,
      tier: 'Academy',
      placementStatus: 'placed',
      placementPlayed: 3,
      placementRequired: 3,
    };
    const queryClient = {
      setQueryData: vi.fn((queryKey: unknown, updater: unknown) => {
        expect(queryKey).toEqual(profileKey);
        expect(typeof updater).toBe('function');
        cachedProfile = (updater as (current: unknown) => unknown)(cachedProfile) as Record<string, unknown>;
      }),
      invalidateQueries: vi.fn(),
    };

    useRealtimeMatchStore.setState({ selfUserId: 'self-1' });
    registerSocketHandlers(queryClient as never);

    mockSocket.fire('match:final_results', {
      matchId: 'match-1',
      winnerId: 'opp-1',
      players: {
        'self-1': { totalPoints: 400, correctAnswers: 2, avgTimeMs: 1200, goals: 0, penaltyGoals: 0 },
        'opp-1': { totalPoints: 700, correctAnswers: 6, avgTimeMs: 1000, goals: 1, penaltyGoals: 0 },
      },
      unlockedAchievements: {},
      durationMs: 60000,
      resultVersion: 123,
      winnerDecisionMethod: 'goals',
      totalPointsFallbackUsed: false,
      rankedOutcome: {
        isPlacement: false,
        byUserId: {
          'self-1': {
            userId: 'self-1',
            oldRp: 7,
            newRp: 0,
            deltaRp: -7,
            oldTier: 'Academy',
            newTier: 'Academy',
            placementStatus: 'placed',
            placementPlayed: 3,
            placementRequired: 3,
            isPlacement: false,
          },
          'opp-1': {
            userId: 'opp-1',
            oldRp: 900,
            newRp: 915,
            deltaRp: 15,
            oldTier: 'Bench',
            newTier: 'Bench',
            placementStatus: 'placed',
            placementPlayed: 3,
            placementRequired: 3,
            isPlacement: false,
          },
        },
      },
    });

    expect(queryClient.setQueryData).toHaveBeenCalledTimes(1);
    expect(cachedProfile).toMatchObject({
      rp: 0,
      tier: 'Academy',
      placementStatus: 'placed',
      placementPlayed: 3,
      placementRequired: 3,
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalled();
    expect(mockSocket.socket.emit).toHaveBeenCalledWith('match:final_results_ack', {
      matchId: 'match-1',
      resultVersion: 123,
    });
  });

  it('does not patch ranked profile cache when match:final_results has no rankedOutcome for self', () => {
    const queryClient = {
      setQueryData: vi.fn(),
      invalidateQueries: vi.fn(),
    };

    useRealtimeMatchStore.setState({ selfUserId: 'self-1' });
    registerSocketHandlers(queryClient as never);

    mockSocket.fire('match:final_results', {
      matchId: 'match-2',
      winnerId: 'opp-1',
      players: {
        'self-1': { totalPoints: 400, correctAnswers: 2, avgTimeMs: 1200, goals: 0, penaltyGoals: 0 },
        'opp-1': { totalPoints: 700, correctAnswers: 6, avgTimeMs: 1000, goals: 1, penaltyGoals: 0 },
      },
      unlockedAchievements: {},
      durationMs: 60000,
      resultVersion: 456,
      winnerDecisionMethod: 'goals',
      totalPointsFallbackUsed: false,
    });

    expect(queryClient.setQueryData).not.toHaveBeenCalled();
    expect(queryClient.invalidateQueries).toHaveBeenCalled();
    expect(mockSocket.socket.emit).toHaveBeenCalledWith('match:final_results_ack', {
      matchId: 'match-2',
      resultVersion: 456,
    });
  });
});
