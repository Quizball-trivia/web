import { beforeEach, describe, expect, it } from 'vitest';
import { useFootballGridStore } from '../footballGrid.store';
import type { FootballGridState, FootballGridSeriesInfo } from '@/lib/realtime/socket.types';

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

  it('accepts board 1 of a new rematch series and ignores the prior series expiry', () => {
    const old: FootballGridSeriesInfo = { seriesId: 'old', format: 'bo3', gameIndex: 3, targetWins: 2, wins: { self: 2, rival: 0 }, draws: 0, winnerUserId: 'self', finished: true };
    const found = (matchId: string, series: FootballGridSeriesInfo) => ({ matchId, state: state({ matchId }), series, opponent: { id: 'rival', username: 'Rival', avatarUrl: null }, capabilities: { canAddFriend: true, canChallenge: true }, serverNow: new Date().toISOString() });
    const store = useFootballGridStore.getState();
    store.setMatchFound(found('old-final', old));
    store.setMatchFound(found('new-first', { ...old, seriesId: 'fresh', gameIndex: 1, finished: false, winnerUserId: null, wins: { self: 0, rival: 0 } }));
    store.setRematch({ seriesId: 'old', seriesVersion: 99, status: 'expired', acceptedUserIds: [], expiresAt: null });
    expect(useFootballGridStore.getState().state?.matchId).toBe('new-first');
    expect(useFootballGridStore.getState().rematch).toBeNull();
    expect(useFootballGridStore.getState().lastGameResult).toBeNull();
  });

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


function found(matchId: string, version = 1, series?: FootballGridSeriesInfo) {
  return {
    matchId, state: state({ matchId, stateVersion: version }), series,
    opponent: { id: 'rival', username: 'Rival', avatarUrl: null },
    capabilities: { canAddFriend: true, canChallenge: true },
    serverNow: new Date().toISOString(),
  };
}

function series(gameIndex: number): FootballGridSeriesInfo {
  return { seriesId: 'series-1', format: 'bo3', gameIndex, targetWins: 2,
    wins: { self: 1, rival: 0 }, draws: 0, winnerUserId: null, finished: false };
}

describe('Grid snapshot delivery ordering', () => {
  beforeEach(() => useFootballGridStore.getState().clear());

  it('ignores old-match snapshots and turn resolutions after the next handoff', () => {
    const store = useFootballGridStore.getState();
    store.setMatchFound(found('match-2', 3));
    store.markCommandPending('current-command');
    const before = useFootballGridStore.getState();
    store.setState({ ...found('match-1', 20), state: state({ phase: 'terminal', stateVersion: 20 }) });
    store.setTurnResolved({ ...found('match-1', 20), actorUserId: 'rival', outcome: 'pass', cellIndex: null, resolvedPlayerId: null });
    store.setCommandResult({ matchId: 'match-1', commandId: 'old-command', stateVersion: 20, outcome: 'pass', resolvedPlayerId: null, attemptId: null, duplicate: true });
    expect(useFootballGridStore.getState()).toBe(before);
  });

  it('ignores stale and repeated handoffs without clearing a pending command', () => {
    const store = useFootballGridStore.getState();
    store.setMatchFound(found('match-1', 7));
    store.markCommandPending('current-command');
    store.setMatchFound(found('match-1', 1));
    store.setMatchFound(found('match-1', 7));
    expect(useFootballGridStore.getState().state?.stateVersion).toBe(7);
    expect(useFootballGridStore.getState().pendingCommandId).toBe('current-command');
  });

  it('retires old handoffs across a series transition and a fresh search', () => {
    const store = useFootballGridStore.getState();
    store.setMatchFound(found('match-1', 8));
    store.setMatchFound(found('match-2', 1));
    store.setMatchFound(found('match-1', 9));
    expect(useFootballGridStore.getState().state?.matchId).toBe('match-2');
    store.setState({ ...found('match-2', 20), state: state({ matchId: 'match-2', stateVersion: 20, phase: 'terminal', status: 'completed' }) });
    store.beginFreshSearch();
    store.setState(found('match-2', 20));
    store.setMatchFound(found('match-2', 20));
    expect(useFootballGridStore.getState().state).toBeNull();
    store.setState(found('fresh-rejoined-match', 5));
    expect(useFootballGridStore.getState().state?.matchId).toBe('fresh-rejoined-match');
  });

  it('accepts a forward series snapshot before handoff, but never an earlier game', () => {
    const store = useFootballGridStore.getState();
    store.setMatchFound(found('match-1', 20, series(1)));
    store.markCommandPending('old-command');
    store.setState(found('match-2', 1, series(2)));
    expect(useFootballGridStore.getState().state?.matchId).toBe('match-2');
    expect(useFootballGridStore.getState().pendingCommandId).toBeNull();
    store.setState(found('match-1', 21, series(1)));
    store.setMatchFound(found('unseen-previous-match', 21, series(1)));
    expect(useFootballGridStore.getState().state?.matchId).toBe('match-2');
  });

  it('allows PLAY to rejoin the same still-active match when the server redirects the search', () => {
    const store = useFootballGridStore.getState();
    store.setMatchFound(found('active-match', 7));
    store.beginFreshSearch();
    store.setMatchFound(found('active-match', 8));
    expect(useFootballGridStore.getState().state?.matchId).toBe('active-match');
  });

  it('allows an explicit handoff to recover another active match', () => {
    const store = useFootballGridStore.getState();
    store.setMatchFound(found('previous-match', 20));
    store.setMatchFound(found('rejoined-match', 1));
    expect(useFootballGridStore.getState().state?.matchId).toBe('rejoined-match');
    store.clear();
    store.setState(found('previous-match', 30));
    expect(useFootballGridStore.getState().state?.matchId).toBe('previous-match');
  });
});
