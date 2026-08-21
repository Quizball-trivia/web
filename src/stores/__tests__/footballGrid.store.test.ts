import { beforeEach, describe, expect, it } from 'vitest';
import { useFootballGridStore } from '../footballGrid.store';
import type { FootballGridState } from '@/lib/realtime/socket.types';

function state(overrides: Partial<FootballGridState> = {}): FootballGridState {
  const criterion = (id: string) => ({
    id,
    key: id,
    family: 'club' as const,
    labelEn: id,
    labelKa: id,
    assetKey: null,
    difficulty: 'normal' as const,
  });
  return {
    matchId: 'match-1',
    status: 'active',
    phase: 'turn',
    board: {
      boardId: 'board-1',
      boardVersion: 1,
      checksum: 'checksum',
      rows: [criterion('r1'), criterion('r2'), criterion('r3')],
      columns: [criterion('c1'), criterion('c2'), criterion('c3')],
    },
    players: [
      { userId: 'self', seat: 1, isBot: false, handoffAcknowledged: true, ready: true, noActionTimeouts: 0, pauseBudgetRemainingMs: 30_000 },
      { userId: 'rival', seat: 2, isBot: false, handoffAcknowledged: true, ready: true, noActionTimeouts: 0, pauseBudgetRemainingMs: 30_000 },
    ],
    openerUserId: 'self',
    currentPlayerUserId: 'self',
    winnerUserId: null,
    turnNumber: 1,
    stateVersion: 1,
    claims: [],
    phaseDeadlineAt: null,
    turnDeadlineAt: new Date(Date.now() + 20_000).toISOString(),
    turnRemainingMs: 20_000,
    pausedAt: null,
    pausedFromPhase: null,
    reconnectDeadlineAt: null,
    completionReason: null,
    ...overrides,
  };
}

describe('footballGrid.store', () => {
  beforeEach(() => useFootballGridStore.getState().clear());

  it('captures match handoff and opponent identity without exposing a bot badge', () => {
    useFootballGridStore.getState().setMatchFound({
      matchId: 'match-1',
      state: state(),
      opponent: { id: 'rival', username: 'Rival', avatarUrl: null },
      capabilities: { canAddFriend: true, canChallenge: true },
      serverNow: new Date().toISOString(),
    });

    const snapshot = useFootballGridStore.getState();
    expect(snapshot.state?.matchId).toBe('match-1');
    expect(snapshot.opponent?.username).toBe('Rival');
    expect(snapshot.search.state).toBe('matched');
  });

  it('ignores stale state snapshots and keeps the newest board claims', () => {
    useFootballGridStore.getState().setState({
      matchId: 'match-1',
      state: state({ stateVersion: 5, turnNumber: 3 }),
      serverNow: new Date().toISOString(),
    });
    useFootballGridStore.getState().setState({
      matchId: 'match-1',
      state: state({ stateVersion: 4, turnNumber: 2 }),
      serverNow: new Date().toISOString(),
    });

    expect(useFootballGridStore.getState().state?.stateVersion).toBe(5);
    expect(useFootballGridStore.getState().state?.turnNumber).toBe(3);
  });

  it('clears an admitted command only after a newer authoritative state arrives', () => {
    useFootballGridStore.getState().setState({ matchId: 'match-1', state: state(), serverNow: new Date().toISOString() });
    useFootballGridStore.getState().markCommandPending('command-1');

    useFootballGridStore.getState().setState({ matchId: 'match-1', state: state(), serverNow: new Date().toISOString() });
    expect(useFootballGridStore.getState().pendingCommandId).toBe('command-1');

    useFootballGridStore.getState().setState({ matchId: 'match-1', state: state({ stateVersion: 2 }), serverNow: new Date().toISOString() });
    expect(useFootballGridStore.getState().pendingCommandId).toBeNull();
  });

  it('starts a clean queue search after a completed match', () => {
    useFootballGridStore.setState({
      state: state({ phase: 'terminal', status: 'completed' }),
      search: { state: 'matched', searchId: null },
      opponent: { id: 'rival', username: 'Rival', avatarUrl: null },
    });

    useFootballGridStore.getState().beginFreshSearch();

    expect(useFootballGridStore.getState().state).toBeNull();
    expect(useFootballGridStore.getState().opponent).toBeNull();
    expect(useFootballGridStore.getState().search.state).toBe('idle');
  });
});
