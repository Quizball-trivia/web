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
});
