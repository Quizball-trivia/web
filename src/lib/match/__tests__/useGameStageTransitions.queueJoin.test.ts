import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useRealtimeMatchStore } from '@/stores/realtimeMatch.store';
import { useRankedMatchmakingStore } from '@/stores/rankedMatchmaking.store';
import { useGameStageTransitions } from '../useGameStageTransitions';
import type { GameConfig } from '@/types/game.runtime';
import type { Socket } from 'socket.io-client';

vi.mock('@/lib/realtime/socket-client', () => ({
  getSocket: () => ({ emit: vi.fn(), connected: true }),
  getSocketDebugSnapshot: () => ({}),
  logSocketDebug: vi.fn(),
}));

type TestSocket = Socket & {
  emit: ReturnType<typeof vi.fn>;
  trigger: (event: 'connect' | 'disconnect') => void;
};

function createSocket(): TestSocket {
  const listeners = new Map<string, Set<() => void>>();
  const socket = {
    emit: vi.fn(),
    connected: true,
    on: vi.fn((event: string, handler: () => void) => {
      const handlers = listeners.get(event) ?? new Set<() => void>();
      handlers.add(handler);
      listeners.set(event, handlers);
      return socket;
    }),
    off: vi.fn((event: string, handler: () => void) => {
      listeners.get(event)?.delete(handler);
      return socket;
    }),
    trigger: (event: 'connect' | 'disconnect') => {
      listeners.get(event)?.forEach((handler) => handler());
    },
  };
  return socket as unknown as TestSocket;
}

const RANKED_CONFIG = { matchType: 'ranked' } as GameConfig;

function renderTransitions(socket: Socket) {
  return renderHook(() =>
    useGameStageTransitions({
      isMultiplayer: true,
      stage: 'matchmaking',
      config: RANKED_CONFIG,
      socket,
      realtimeDraft: null,
      realtimeMatch: { matchId: null } as never,
      setStage: vi.fn(),
    })
  );
}

describe('ranked matchmaking initial queue join', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // The hook's geo-hint probe may call fetch on mount; keep the suite
    // hermetic — the hint silently falls back to the locale-derived value.
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network disabled in unit tests')));
    window.sessionStorage.clear();
    window.localStorage.clear();
    useRealtimeMatchStore.getState().reset();
    useRankedMatchmakingStore.getState().clearRankedMatchmaking?.();
    useRankedMatchmakingStore.setState({
      rankedSearching: false,
      rankedSearchStartedAt: null,
      rankedFoundOpponent: null,
      rankedQueueLeftSeq: 0,
    });
  });

  afterEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('emits ranked:queue_join even when the session snapshot is null (Play Again deadlock guard)', () => {
    // Ranked Play Again resets the realtime store -> sessionState null.
    // session:state is only pushed by the server, so waiting for it here
    // deadlocked the search forever (staging 2026-06-10: zero queue_join
    // reached the server after the result screen). The server validates the
    // join authoritatively and answers session:blocked when needed.
    useRealtimeMatchStore.setState({ sessionState: null });
    const socket = createSocket();

    renderTransitions(socket);

    expect(socket.emit).toHaveBeenCalledWith(
      'ranked:queue_join',
      expect.objectContaining({ searchMode: 'human_first' })
    );
  });

  it('still skips the join when there is positive evidence of an existing session', () => {
    useRealtimeMatchStore.setState({
      sessionState: {
        state: 'IN_MATCH',
        activeMatchId: 'm-existing',
        waitingLobbyId: null,
        queueSearchId: null,
      } as never,
    });
    const socket = createSocket();

    renderTransitions(socket);

    expect(socket.emit).not.toHaveBeenCalledWith('ranked:queue_join', expect.anything());
  });

  it('emits the join when a READY session snapshot is present (unchanged behavior)', () => {
    useRealtimeMatchStore.setState({
      sessionState: {
        state: 'READY',
        activeMatchId: null,
        waitingLobbyId: null,
        queueSearchId: null,
      } as never,
    });
    const socket = createSocket();

    renderTransitions(socket);

    expect(socket.emit).toHaveBeenCalledWith(
      'ranked:queue_join',
      expect.objectContaining({ searchMode: 'human_first' })
    );
  });

  it('includes the stored ranked queue intent on the first queue join', () => {
    window.sessionStorage.setItem(
      'quizball.ranked_queue.intent',
      JSON.stringify({
        source: 'play_again',
        clientRequestId: 'client-request-1',
        createdAtMs: Date.now(),
      })
    );
    const socket = createSocket();

    renderTransitions(socket);

    expect(socket.emit).toHaveBeenCalledWith(
      'ranked:queue_join',
      expect.objectContaining({
        searchMode: 'human_first',
        source: 'play_again',
        reason: 'initial',
        clientRequestId: 'client-request-1',
      })
    );
    expect(window.sessionStorage.getItem('quizball.ranked_queue.intent')).toBeNull();
  });

  it('falls back to unknown source when no ranked queue intent is stored', () => {
    const socket = createSocket();

    renderTransitions(socket);

    expect(socket.emit).toHaveBeenCalledWith(
      'ranked:queue_join',
      expect.objectContaining({
        searchMode: 'human_first',
        source: 'unknown',
        reason: 'initial',
        clientRequestId: expect.any(String),
      })
    );
  });

  it('retries a missing queue ack with the same client request id', async () => {
    vi.useFakeTimers();
    try {
      window.sessionStorage.setItem(
        'quizball.ranked_queue.intent',
        JSON.stringify({
          source: 'mode_select',
          clientRequestId: 'client-request-ack-timeout',
          createdAtMs: Date.now(),
        })
      );
      useRealtimeMatchStore.setState({ sessionState: null });
      const socket = createSocket();

      renderTransitions(socket);
      expect(socket.emit).toHaveBeenCalledWith(
        'ranked:queue_join',
        expect.objectContaining({
          source: 'mode_select',
          reason: 'initial',
          clientRequestId: 'client-request-ack-timeout',
        })
      );

      (socket.emit as ReturnType<typeof vi.fn>).mockClear();
      await vi.advanceTimersByTimeAsync(2600); // > RANKED_QUEUE_ACK_TIMEOUT_MS

      expect(socket.emit).toHaveBeenCalledWith(
        'ranked:queue_join',
        expect.objectContaining({
          source: 'mode_select',
          reason: 'retry',
          clientRequestId: 'client-request-ack-timeout',
        })
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('re-joins after a silent search loss (acked search + server says IDLE, no error code)', async () => {
    vi.useFakeTimers();
    try {
      // Reproduces the stuck-spinner bug: the search WAS acked
      // (rankedSearchStartedAt set), then the socket blipped — the backend
      // cancels the search immediately on disconnect and emits
      // session:state IDLE on reconnect, with NO error event. The stale local
      // ack must not mask the loss; the hook must re-emit queue_join.
      useRealtimeMatchStore.setState({
        sessionState: {
          state: 'IDLE',
          activeMatchId: null,
          waitingLobbyId: null,
          queueSearchId: null,
        } as never,
        error: null,
      });
      const socket = createSocket();

      renderTransitions(socket);
      // Initial mount join fires once; simulate that it was acked, then lost.
      (socket.emit as ReturnType<typeof vi.fn>).mockClear();
      useRankedMatchmakingStore.setState({
        rankedSearching: true,
        rankedSearchStartedAt: Date.now() - 3000,
        rankedFoundOpponent: null,
      });

      await vi.advanceTimersByTimeAsync(1000); // > RANKED_QUEUE_RETRY_DELAY_MS

      expect(socket.emit).toHaveBeenCalledWith(
        'ranked:queue_join',
        expect.objectContaining({ searchMode: 'human_first', reason: 'recovery_retry' })
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('re-joins on socket reconnect even when the local session snapshot still looks queued', () => {
    useRealtimeMatchStore.setState({
      sessionState: {
        state: 'IN_QUEUE',
        activeMatchId: null,
        waitingLobbyId: null,
        queueSearchId: 'stale-search-1',
      } as never,
      error: null,
    });
    useRankedMatchmakingStore.setState({
      rankedSearching: true,
      rankedSearchStartedAt: Date.now() - 3000,
      rankedFoundOpponent: null,
    });
    const socket = createSocket();

    renderTransitions(socket);
    expect(socket.emit).not.toHaveBeenCalledWith('ranked:queue_join', expect.anything());

    socket.connected = false;
    socket.trigger('disconnect');
    socket.connected = true;
    socket.trigger('connect');

    expect(useRankedMatchmakingStore.getState().rankedSearchStartedAt).toBeNull();
    expect(socket.emit).toHaveBeenCalledWith(
      'ranked:queue_join',
      expect.objectContaining({ searchMode: 'human_first', reason: 'recovery_retry' })
    );
  });

  it('does NOT re-join while the server still confirms IN_QUEUE', async () => {
    vi.useFakeTimers();
    try {
      useRealtimeMatchStore.setState({
        sessionState: {
          state: 'IN_QUEUE',
          activeMatchId: null,
          waitingLobbyId: null,
          queueSearchId: 'search-1',
        } as never,
        error: null,
      });
      const socket = createSocket();

      renderTransitions(socket);
      (socket.emit as ReturnType<typeof vi.fn>).mockClear();
      useRankedMatchmakingStore.setState({
        rankedSearching: true,
        rankedSearchStartedAt: Date.now() - 3000,
        rankedFoundOpponent: null,
      });

      await vi.advanceTimersByTimeAsync(1000);

      expect(socket.emit).not.toHaveBeenCalledWith('ranked:queue_join', expect.anything());
    } finally {
      vi.useRealTimers();
    }
  });
});
