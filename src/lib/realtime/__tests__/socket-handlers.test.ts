import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useRealtimeMatchStore } from '@/stores/realtimeMatch.store';
import { registerSocketHandlers } from '../socket-handlers';
import { __setSocketOverride } from '../socket-client';
import type { Socket } from 'socket.io-client';
import type { ServerToClientEvents, ClientToServerEvents } from '../socket.types';

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

    // Create fresh mock socket and install as override
    mockSocket = createMockSocket();
    __setSocketOverride(mockSocket.socket);
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
});
