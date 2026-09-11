import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FootballGridState } from '@/lib/realtime/socket.types';
import { useFootballGridStore } from '@/stores/footballGrid.store';

const socket = vi.hoisted(() => ({
  connected: true,
  emit: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
}));

vi.mock('@/lib/realtime/useRealtimeConnection', () => ({
  useRealtimeConnection: () => socket,
  useRealtimeMatchSocket: () => socket,
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
    socket.connected = true;
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

    await waitFor(() => expect(socket.emit).toHaveBeenCalledWith('grid:search_start', { locale: 'en', theme: 'european' }));
    unmount();
  });

  it('persists cancellation intent when the player leaves before a searchId arrives', async () => {
    const { result, unmount } = renderHook(() => useRealtimeFootballGrid({ enabled: true, selfUserId: 'self', locale: 'en' }));
    await waitFor(() => expect(socket.emit).toHaveBeenCalledWith('grid:search_start', { locale: 'en', theme: 'european' }));

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


describe('Grid ready and handoff retry recovery', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    socket.connected = true;
    socket.emit.mockClear();
    socket.on.mockClear();
    socket.off.mockClear();
    useFootballGridStore.getState().clear();
  });
  afterEach(() => vi.useRealTimers());

  function waiting(phase: 'loading' | 'handoff', version = 3) {
    const snapshot = state({ phase, status: phase, stateVersion: version });
    snapshot.players.forEach((player) => { player.handoffAcknowledged = phase === 'loading'; });
    return { matchId: snapshot.matchId, state: snapshot, serverNow: new Date().toISOString() };
  }

  it.each(['loading', 'handoff'] as const)('retries a transient %s failure with a stable command ID', (phase) => {
    const snapshot = waiting(phase);
    useFootballGridStore.getState().setState(snapshot);
    const hook = renderHook(() => useRealtimeFootballGrid({ enabled: true, selfUserId: 'self', locale: 'en', autoStart: false }));
    const event = phase === 'loading' ? 'grid:client_ready' : 'grid:match_found_ack';
    const first = socket.emit.mock.calls.find(([name]) => name === event)![1];
    act(() => { useFootballGridStore.getState().setError({ code: 'GRID_PRESENCE_BUSY', message: 'Retry' }); });
    // Same-version resyncs must not keep resetting the retry timer.
    for (let i = 0; i < 4; i++) {
      act(() => {
        vi.advanceTimersByTime(250);
        useFootballGridStore.getState().setState({ ...snapshot, state: { ...snapshot.state } });
      });
    }
    const calls = socket.emit.mock.calls.filter(([name]) => name === event);
    expect(calls).toHaveLength(2);
    expect(calls[1][1]).toEqual(first);
    expect(socket.emit).toHaveBeenCalledWith('grid:resync', { matchId: snapshot.matchId });
    hook.unmount();
    socket.emit.mockClear();
    act(() => { vi.advanceTimersByTime(10_000); });
    expect(socket.emit).not.toHaveBeenCalled();
  });

  it('stops retrying once readiness is acknowledged', () => {
    const snapshot = waiting('loading');
    useFootballGridStore.getState().setState(snapshot);
    const hook = renderHook(() => useRealtimeFootballGrid({ enabled: true, selfUserId: 'self', locale: 'en', autoStart: false }));
    act(() => { vi.advanceTimersByTime(1_000); });
    const acknowledged = waiting('loading', 4);
    acknowledged.state.players[0].ready = true;
    act(() => { useFootballGridStore.getState().setState(acknowledged); });
    socket.emit.mockClear();
    act(() => { vi.advanceTimersByTime(15_000); });
    expect(socket.emit.mock.calls.filter(([name]) => name === 'grid:client_ready')).toHaveLength(0);
    hook.unmount();
  });

  it('does not buffer retries offline and resumes with the same ID on reconnect', () => {
    useFootballGridStore.getState().setState(waiting('loading'));
    const hook = renderHook(() => useRealtimeFootballGrid({ enabled: true, selfUserId: 'self', locale: 'en', autoStart: false }));
    const first = socket.emit.mock.calls.find(([name]) => name === 'grid:client_ready')![1];
    socket.connected = false;
    socket.emit.mockClear();
    act(() => { vi.advanceTimersByTime(3_000); });
    expect(socket.emit.mock.calls.filter(([name]) => name === 'grid:client_ready')).toHaveLength(0);
    socket.connected = true;
    act(() => {
      socket.on.mock.calls.find(([name]) => name === 'connect')![1]();
      vi.advanceTimersByTime(4_000);
    });
    expect(socket.emit).toHaveBeenCalledWith('grid:client_ready', first);
    hook.unmount();
  });

  it('waits for assets and renews the command when the authoritative version changes', () => {
    useFootballGridStore.getState().setState(waiting('loading'));
    const hook = renderHook(({ assetsReady }) => useRealtimeFootballGrid({ enabled: true, selfUserId: 'self', locale: 'en', autoStart: false, assetsReady }), { initialProps: { assetsReady: false } });
    act(() => { vi.advanceTimersByTime(3_000); });
    expect(socket.emit.mock.calls.filter(([name]) => name === 'grid:client_ready')).toHaveLength(0);
    hook.rerender({ assetsReady: true });
    const first = socket.emit.mock.calls.find(([name]) => name === 'grid:client_ready')![1];
    act(() => { useFootballGridStore.getState().setState(waiting('loading', 4)); });
    const last = socket.emit.mock.calls.filter(([name]) => name === 'grid:client_ready').at(-1)![1];
    expect(last.expectedStateVersion).toBe(4);
    expect(last.commandId).not.toBe(first.commandId);
    hook.unmount();
  });
});
