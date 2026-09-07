import { create } from 'zustand';
import type {
  ErrorPayload,
  FootballGridCommandResultPayload,
  FootballGridCompletedPayload,
  FootballGridMatchFoundPayload,
  FootballGridRematchStatePayload,
  FootballGridSearchStatePayload,
  FootballGridSeriesInfo,
  FootballGridState,
  FootballGridStatePayload,
  FootballGridTurnResolvedPayload,
  OpponentInfo,
} from '@/lib/realtime/socket.types';

/** The game that just ended inside a still-running series, shown as a splash until the next board is live. */
export interface FootballGridLastGameResult {
  matchId: string;
  winnerUserId: string | null;
  completionReason: FootballGridState['completionReason'];
  series: FootballGridSeriesInfo;
}

interface FootballGridStoreState {
  search: FootballGridSearchStatePayload;
  state: FootballGridState | null;
  supersededMatchIds: string[];
  /** Best-of-N progress for the current match's series; null for legacy single games. */
  series: FootballGridSeriesInfo | null;
  lastGameResult: FootballGridLastGameResult | null;
  opponent: OpponentInfo | null;
  capabilities: FootballGridMatchFoundPayload['capabilities'] | null;
  completed: FootballGridCompletedPayload | null;
  rematch: FootballGridRematchStatePayload | null;
  lastCommandResult: FootballGridCommandResultPayload | null;
  lastTurnResolved: FootballGridTurnResolvedPayload | null;
  pendingCommandId: string | null;
  reportedAttemptIds: string[];
  searchCancellationPending: boolean;
  error: ErrorPayload | null;
  serverTimeOffsetMs: number;
  setSearchState: (payload: FootballGridSearchStatePayload) => void;
  setMatchFound: (payload: FootballGridMatchFoundPayload) => void;
  setState: (payload: FootballGridStatePayload) => void;
  setCompleted: (payload: FootballGridCompletedPayload) => void;
  setRematch: (payload: FootballGridRematchStatePayload) => void;
  setCommandResult: (payload: FootballGridCommandResultPayload) => void;
  setTurnResolved: (payload: FootballGridTurnResolvedPayload) => void;
  markCommandPending: (commandId: string | null) => void;
  clearCommandFeedback: () => void;
  markAttemptReported: (attemptId: string) => void;
  setError: (payload: ErrorPayload | null) => void;
  /** Records an earlier series game's result that arrived after the next handoff. */
  recordPreviousGameResult: (payload: FootballGridCompletedPayload) => void;
  clearLastGameResult: () => void;
  requestSearchCancellation: () => void;
  beginFreshSearch: () => void;
  clear: () => void;
}

const IDLE_SEARCH: FootballGridSearchStatePayload = {
  state: 'idle',
  searchId: null,
};

function resetGridState() {
  return {
    search: IDLE_SEARCH,
    state: null,
    supersededMatchIds: [],
    series: null,
    lastGameResult: null,
    opponent: null,
    capabilities: null,
    completed: null,
    rematch: null,
    lastCommandResult: null,
    lastTurnResolved: null,
    pendingCommandId: null,
    reportedAttemptIds: [],
    searchCancellationPending: false,
    error: null,
    serverTimeOffsetMs: 0,
  };
}

function serverOffset(serverNow: string): number {
  const serverMs = Date.parse(serverNow);
  return Number.isFinite(serverMs) ? serverMs - Date.now() : 0;
}

function isOlderState(current: FootballGridState | null, incoming: FootballGridState): boolean {
  return Boolean(current?.matchId === incoming.matchId && incoming.stateVersion < current.stateVersion);
}

function isPreviousSeriesGame(current: FootballGridStoreState, payload: FootballGridStatePayload): boolean {
  return Boolean(current.state?.matchId !== payload.matchId && current.series && payload.series
    && current.series.seriesId === payload.series.seriesId
    && payload.series.gameIndex <= current.series.gameIndex);
}

function shouldIgnoreSnapshot(current: FootballGridStoreState, payload: FootballGridStatePayload): boolean {
  if (current.supersededMatchIds.includes(payload.matchId) || isOlderState(current.state, payload.state)) return true;
  if (!current.state || current.state.matchId === payload.matchId) return false;
  // Ordinary events cannot change matches, except a forward step within the
  // authoritative series (the next handoff may still be in transit).
  return !current.series || !payload.series || current.series.seriesId !== payload.series.seriesId
    || payload.series.gameIndex <= current.series.gameIndex;
}

function retireCurrentMatch(current: FootballGridStoreState, nextMatchId?: string): string[] {
  const matchId = current.state?.matchId;
  return matchId && matchId !== nextMatchId && !current.supersededMatchIds.includes(matchId)
    ? [...current.supersededMatchIds, matchId]
    : current.supersededMatchIds;
}

function lastGameResultFrom(payload: FootballGridCompletedPayload): FootballGridLastGameResult | null {
  if (!payload.series || payload.series.finished) return null;
  return {
    matchId: payload.matchId,
    winnerUserId: payload.state.winnerUserId,
    completionReason: payload.state.completionReason,
    series: payload.series,
  };
}

export const useFootballGridStore = create<FootballGridStoreState>((set) => ({
  search: IDLE_SEARCH,
  state: null,
  supersededMatchIds: [],
  series: null,
  lastGameResult: null,
  opponent: null,
  capabilities: null,
  completed: null,
  rematch: null,
  lastCommandResult: null,
  lastTurnResolved: null,
  pendingCommandId: null,
  reportedAttemptIds: [],
  searchCancellationPending: false,
  error: null,
  serverTimeOffsetMs: 0,

  setSearchState: (payload) => set((current) => {
    if (
      payload.state === 'idle' &&
      current.search.searchId &&
      payload.searchId &&
      payload.searchId !== current.search.searchId
    ) {
      return current;
    }
    return {
      search: payload,
      searchCancellationPending: payload.state === 'idle' ? false : current.searchCancellationPending,
      error: payload.state === 'searching' ? null : current.error,
    };
  }),

  setMatchFound: (payload) => set((current) => {
    if (current.supersededMatchIds.includes(payload.matchId) || isPreviousSeriesGame(current, payload)) return current;
    if (current.state?.matchId === payload.matchId && isOlderState(current.state, payload.state)) {
      // A resync handoff that lost the race with a newer snapshot still carries the
      // opponent and capabilities this tab may never have seen: keep the newer
      // state, take the bootstrap metadata.
      return {
        search: { state: 'matched' as const, searchId: null },
        series: current.series ?? payload.series ?? null,
        opponent: payload.opponent,
        capabilities: payload.capabilities,
      };
    }
    if (isOlderState(current.state, payload.state)) return current;
    if (current.state?.matchId === payload.matchId) {
      // Rejoin/redelivery enriches the same match without clearing its result,
      // pending command, or feedback. A stale handoff cannot rewind the board.
      return {
        search: { state: 'matched' as const, searchId: null },
        state: payload.state,
        series: payload.series ?? current.series,
        opponent: payload.opponent,
        capabilities: payload.capabilities,
        lastGameResult: payload.state.phase === 'turn' ? null : current.lastGameResult,
        pendingCommandId: payload.state.stateVersion > current.state.stateVersion ? null : current.pendingCommandId,
        serverTimeOffsetMs: serverOffset(payload.serverNow),
      };
    }
    return {
      supersededMatchIds: retireCurrentMatch(current, payload.matchId),
      search: { state: 'matched', searchId: null },
      state: payload.state,
      series: payload.series ?? null,
      // Carried into the next game of the same series so the splash can show
      // the score while the new board loads; anything else is stale.
      lastGameResult: current.lastGameResult && current.lastGameResult.series.seriesId === payload.series?.seriesId
        ? current.lastGameResult
        : null,
      opponent: payload.opponent,
      capabilities: payload.capabilities,
      completed: null,
      rematch: null,
      lastCommandResult: null,
      lastTurnResolved: null,
      pendingCommandId: null,
      reportedAttemptIds: [],
      searchCancellationPending: false,
      error: null,
      serverTimeOffsetMs: serverOffset(payload.serverNow),
    };
  }),

  setState: (payload) => set((current) => {
    if (shouldIgnoreSnapshot(current, payload)) return current;
    return {
      state: payload.state,
      supersededMatchIds: retireCurrentMatch(current, payload.matchId),
      series: payload.series ?? current.series,
      // The splash has done its job once the new game is actually being played.
      lastGameResult: payload.state.phase === 'turn' ? null : current.lastGameResult,
      error: null,
      completed: current.state?.matchId === payload.matchId ? current.completed : null,
      rematch: current.state?.matchId === payload.matchId ? current.rematch : null,
      pendingCommandId: current.state?.matchId === payload.matchId
        && payload.state.stateVersion <= current.state.stateVersion ? current.pendingCommandId : null,
      serverTimeOffsetMs: serverOffset(payload.serverNow),
    };
  }),

  setCompleted: (payload) => set((current) => {
    // A completion is result delivery: only a provably stale one is ignored (superseded
    // match, older snapshot of the same match, earlier game of the current series).
    // An unseen match — played in another tab while this one held an old board —
    // replaces the old board so its result and rematch offer are not lost.
    if (current.supersededMatchIds.includes(payload.matchId)
      || isOlderState(current.state, payload.state) || isPreviousSeriesGame(current, payload)) return current;
    return {
      state: payload.state,
      supersededMatchIds: retireCurrentMatch(current, payload.matchId),
      completed: payload,
      series: payload.series ?? current.series,
      lastGameResult: lastGameResultFrom(payload),
      // Only human-vs-human non-random series may offer a rematch; the
      // backend's `eligible` flag is the authority (bot and random-queue
      // matches would be rejected server-side). A redelivered completion
      // must not regress a newer rematch broadcast to its older snapshot.
      rematch: (() => {
        if (!payload.rematch?.eligible) return current.rematch && current.completed?.matchId === payload.matchId ? current.rematch : null;
        const offered = {
          seriesId: payload.rematch.seriesId,
          seriesVersion: payload.rematch.seriesVersion,
          status: 'pending' as const,
          acceptedUserIds: payload.rematch.acceptedUserIds,
          expiresAt: payload.rematch.expiresAt,
        };
        if (current.rematch && current.rematch.seriesId === offered.seriesId && current.rematch.seriesVersion > offered.seriesVersion) {
          return current.rematch;
        }
        return offered;
      })(),
      pendingCommandId: null,
      error: null,
      serverTimeOffsetMs: serverOffset(payload.serverNow),
    };
  }),
  setRematch: (payload) => set((current) => {
    // Rematch broadcasts can arrive out of order across reconnects; never let
    // an older series version regress a terminal state back to pending.
    if (current.rematch && payload.seriesVersion < current.rematch.seriesVersion) return current;
    return { rematch: payload };
  }),
  setCommandResult: (payload) => set((current) => {
    if (current.supersededMatchIds.includes(payload.matchId)
      || (current.state && current.state.matchId !== payload.matchId)) return current;
    return {
      lastCommandResult: payload,
      pendingCommandId: current.pendingCommandId === payload.commandId ? null : current.pendingCommandId,
    };
  }),
  setTurnResolved: (payload) => set((current) => {
    if (shouldIgnoreSnapshot(current, payload)) return current;
    return {
      state: payload.state,
      supersededMatchIds: retireCurrentMatch(current, payload.matchId),
      lastTurnResolved: payload,
      pendingCommandId: null,
      serverTimeOffsetMs: serverOffset(payload.serverNow),
    };
  }),
  markCommandPending: (commandId) => set({
    pendingCommandId: commandId,
    lastCommandResult: null,
    error: null,
  }),
  clearCommandFeedback: () => set({ lastCommandResult: null }),
  markAttemptReported: (attemptId) => set((current) => ({
    reportedAttemptIds: current.reportedAttemptIds.includes(attemptId)
      ? current.reportedAttemptIds
      : [...current.reportedAttemptIds, attemptId],
  })),
  setError: (payload) => set({ error: payload, pendingCommandId: null }),
  recordPreviousGameResult: (payload) => set((current) => {
    const result = lastGameResultFrom(payload);
    if (!result) return current;
    // Only the immediately preceding game, and only while the next one has not
    // started playing: a redelivered old result must not bring the splash back.
    const currentGameIndex = current.series?.gameIndex ?? 0;
    if (result.series.gameIndex !== currentGameIndex - 1) return current;
    if (current.state && current.state.matchId !== payload.matchId && current.state.phase === 'turn') return current;
    return { lastGameResult: result, series: current.series ?? payload.series ?? null };
  }),
  clearLastGameResult: () => set({ lastGameResult: null }),
  requestSearchCancellation: () => set({ searchCancellationPending: true }),
  beginFreshSearch: () => set((current) => ({
    ...resetGridState(),
    // The server may redirect PLAY back into a still-resumable active match.
    // A finished match is safe to retire before the new search gets a handoff.
    supersededMatchIds: current.state?.phase === 'terminal' ? retireCurrentMatch(current) : current.supersededMatchIds,
  })),
  clear: () => set(resetGridState()),
}));
