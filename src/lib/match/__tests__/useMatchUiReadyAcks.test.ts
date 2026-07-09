import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Handler = () => void;

const socketMock = vi.hoisted(() => {
  const handlers = new Map<string, Set<Handler>>();
  const emit = vi.fn();
  const socket = {
    connected: true,
    id: 'socket-1' as string | undefined,
    emit,
    on: vi.fn((event: string, handler: Handler) => {
      const entries = handlers.get(event) ?? new Set<Handler>();
      entries.add(handler);
      handlers.set(event, entries);
      return socket;
    }),
    off: vi.fn((event: string, handler: Handler) => {
      handlers.get(event)?.delete(handler);
      return socket;
    }),
  };

  return {
    socket,
    emit,
    reset: () => {
      handlers.clear();
      emit.mockReset();
      socket.on.mockClear();
      socket.off.mockClear();
      socket.connected = true;
      socket.id = 'socket-1';
    },
    trigger: (event: string) => {
      handlers.get(event)?.forEach((handler) => handler());
    },
  };
});

vi.mock('@/lib/realtime/socket-client', () => ({
  getSocket: () => socketMock.socket,
}));

describe('useMatchUiReadyAcks', () => {
  beforeEach(() => {
    socketMock.reset();
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callback(0);
      return 1;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('re-emits kickoff ready for the same match after the socket id changes', async () => {
    const { useMatchUiReadyAcks } = await import('../useMatchUiReadyAcks');

    renderHook(() =>
      useMatchUiReadyAcks({
        matchId: 'match-1',
        currentQuestionIndex: null,
        waitingForReady: {
          matchId: 'match-1',
          phase: 'kickoff',
          readyCount: 0,
          totalCount: 2,
          forceStartsAt: '2026-07-08T00:00:00.000Z',
          forceStartsAtMs: Date.parse('2026-07-08T00:00:00.000Z'),
        },
      })
    );

    expect(socketMock.emit).toHaveBeenCalledWith('match:kickoff_ui_ready', { matchId: 'match-1' });
    expect(socketMock.emit.mock.calls.filter(([event]) => event === 'match:kickoff_ui_ready')).toHaveLength(1);

    await act(async () => {
      socketMock.socket.connected = false;
      socketMock.socket.id = undefined;
      socketMock.trigger('disconnect');
    });
    await act(async () => {
      socketMock.socket.connected = true;
      socketMock.socket.id = 'socket-2';
      socketMock.trigger('connect');
    });

    expect(socketMock.emit.mock.calls.filter(([event]) => event === 'match:kickoff_ui_ready')).toHaveLength(2);
  });
});
