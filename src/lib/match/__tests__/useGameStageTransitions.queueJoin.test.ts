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

function createSocket() {
  return { emit: vi.fn(), connected: true } as unknown as Socket;
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
    useRealtimeMatchStore.getState().reset();
    useRankedMatchmakingStore.getState().clearRankedMatchmaking?.();
    useRankedMatchmakingStore.setState({
      rankedSearching: false,
      rankedSearchStartedAt: null,
      rankedFoundOpponent: null,
    });
  });

  afterEach(() => {
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
        expect.objectContaining({ searchMode: 'human_first' })
      );
    } finally {
      vi.useRealTimers();
    }
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
