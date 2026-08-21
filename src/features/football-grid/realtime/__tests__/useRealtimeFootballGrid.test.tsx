import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FootballGridState } from '@/lib/realtime/socket.types';
import { useFootballGridStore } from '@/stores/footballGrid.store';

const socket = vi.hoisted(() => ({
  emit: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
}));

vi.mock('@/lib/realtime/useRealtimeConnection', () => ({
  useRealtimeConnection: () => socket,
}));

import { useRealtimeFootballGrid } from '../useRealtimeFootballGrid';

function state(overrides: Partial<FootballGridState> = {}): FootballGridState {
  const criterion = (id: string) => ({ id, key: id, family: 'club' as const, labelEn: id, labelKa: id, assetKey: null, difficulty: 'normal' as const });
  return {
    matchId: 'match-1',
    status: 'handoff',
    phase: 'handoff',
    board: { boardId: 'board-1', boardVersion: 1, checksum: 'checksum', rows: [criterion('r1'), criterion('r2'), criterion('r3')], columns: [criterion('c1'), criterion('c2'), criterion('c3')] },
    players: [
      { userId: 'self', seat: 1, isBot: false, handoffAcknowledged: false, ready: false, noActionTimeouts: 0, pauseBudgetRemainingMs: 30_000 },
      { userId: 'rival', seat: 2, isBot: false, handoffAcknowledged: false, ready: false, noActionTimeouts: 0, pauseBudgetRemainingMs: 30_000 },
    ],
    openerUserId: 'self',
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

describe('useRealtimeFootballGrid', () => {
  beforeEach(() => {
    socket.emit.mockClear();
    socket.on.mockClear();
    socket.off.mockClear();
    useFootballGridStore.getState().clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('joins the unique Grid queue as soon as the live route opens', async () => {
    const { unmount } = renderHook(() => useRealtimeFootballGrid({ enabled: true, selfUserId: 'self', locale: 'en' }));

    await waitFor(() => expect(socket.emit).toHaveBeenCalledWith('grid:search_start', { locale: 'en' }));
    unmount();
  });

  it('persists cancellation intent when the player leaves before a searchId arrives', async () => {
    const { result, unmount } = renderHook(() => useRealtimeFootballGrid({ enabled: true, selfUserId: 'self', locale: 'en' }));
    await waitFor(() => expect(socket.emit).toHaveBeenCalledWith('grid:search_start', { locale: 'en' }));

    act(() => result.current.actions.cancelSearch());
    expect(useFootballGridStore.getState().searchCancellationPending).toBe(true);
    unmount();
  });

  it('acknowledges handoff and loading snapshots with their exact state version', async () => {
    const { unmount } = renderHook(() => useRealtimeFootballGrid({ enabled: true, selfUserId: 'self', locale: 'ka', autoStart: false }));
    act(() => {
      useFootballGridStore.getState().setMatchFound({
        matchId: 'match-1',
        state: state(),
        opponent: { id: 'rival', username: 'Rival', avatarUrl: null },
        capabilities: { canAddFriend: false, canChallenge: false },
        serverNow: new Date().toISOString(),
      });
    });

    await waitFor(() => expect(socket.emit).toHaveBeenCalledWith('grid:match_found_ack', expect.objectContaining({ matchId: 'match-1', expectedStateVersion: 1 })));

    act(() => {
      useFootballGridStore.getState().setState({
        matchId: 'match-1',
        state: state({
          phase: 'loading',
          status: 'loading',
          stateVersion: 2,
          players: [
            { userId: 'self', seat: 1, isBot: false, handoffAcknowledged: true, ready: false, noActionTimeouts: 0, pauseBudgetRemainingMs: 30_000 },
            { userId: 'rival', seat: 2, isBot: false, handoffAcknowledged: true, ready: false, noActionTimeouts: 0, pauseBudgetRemainingMs: 30_000 },
          ],
        }),
        serverNow: new Date().toISOString(),
      });
    });

    await waitFor(() => expect(socket.emit).toHaveBeenCalledWith('grid:client_ready', expect.objectContaining({ matchId: 'match-1', expectedStateVersion: 2 })));
    unmount();
  });

  it('submits only on the local turn and pins the authoritative state version', () => {
    const { result, unmount } = renderHook(() => useRealtimeFootballGrid({ enabled: true, selfUserId: 'self', locale: 'en', autoStart: false }));
    act(() => {
      useFootballGridStore.getState().setState({
        matchId: 'match-1',
        state: state({ phase: 'turn', status: 'active', currentPlayerUserId: 'self', stateVersion: 7 }),
        serverNow: new Date().toISOString(),
      });
    });

    let accepted = false;
    act(() => {
      accepted = result.current.actions.submitAnswer(4, '  Thierry Henry  ');
    });

    expect(accepted).toBe(true);
    expect(socket.emit).toHaveBeenCalledWith('grid:submit_answer', expect.objectContaining({
      matchId: 'match-1',
      expectedStateVersion: 7,
      cellIndex: 4,
      text: 'Thierry Henry',
      locale: 'en',
    }));
    expect(useFootballGridStore.getState().pendingCommandId).toEqual(expect.any(String));
    unmount();
  });

  it('clears a dropped pending command and resyncs the authoritative match', () => {
    vi.useFakeTimers();
    const { result, unmount } = renderHook(() => useRealtimeFootballGrid({ enabled: true, selfUserId: 'self', locale: 'en', autoStart: false }));
    act(() => {
      useFootballGridStore.getState().setState({
        matchId: 'match-1',
        state: state({ phase: 'turn', status: 'active', currentPlayerUserId: 'self', stateVersion: 7 }),
        serverNow: new Date().toISOString(),
      });
    });

    act(() => {
      expect(result.current.actions.pass()).toBe(true);
    });
    expect(useFootballGridStore.getState().pendingCommandId).not.toBeNull();

    act(() => {
      vi.advanceTimersByTime(5_000);
    });

    expect(useFootballGridStore.getState().pendingCommandId).toBeNull();
    expect(socket.emit).toHaveBeenCalledWith('grid:resync', { matchId: 'match-1' });
    unmount();
  });
});
