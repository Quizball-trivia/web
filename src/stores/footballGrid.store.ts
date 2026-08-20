import { create } from 'zustand';
import type {
  ErrorPayload,
  FootballGridCommandResultPayload,
  FootballGridCompletedPayload,
  FootballGridMatchFoundPayload,
  FootballGridRematchStatePayload,
  FootballGridSearchStatePayload,
  FootballGridState,
  FootballGridStatePayload,
  FootballGridTurnResolvedPayload,
  OpponentInfo,
} from '@/lib/realtime/socket.types';

interface FootballGridStoreState {
  search: FootballGridSearchStatePayload;
  state: FootballGridState | null;
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
  return Boolean(
    current &&
      current.matchId === incoming.matchId &&
      incoming.stateVersion < current.stateVersion,
  );
}

export const useFootballGridStore = create<FootballGridStoreState>((set) => ({
  search: IDLE_SEARCH,
  state: null,
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

  setMatchFound: (payload) => set({
    search: { state: 'matched', searchId: null },
    state: payload.state,
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
  }),

  setState: (payload) => set((current) => {
    if (isOlderState(current.state, payload.state)) return current;
    return {
      state: payload.state,
      error: null,
      pendingCommandId:
        current.pendingCommandId && payload.state.stateVersion > (current.state?.stateVersion ?? -1)
          ? null
          : current.pendingCommandId,
      serverTimeOffsetMs: serverOffset(payload.serverNow),
    };
  }),

  setCompleted: (payload) => set((current) => {
    if (isOlderState(current.state, payload.state)) return current;
    return {
      state: payload.state,
      completed: payload,
      rematch: payload.rematch
        ? {
            seriesId: payload.rematch.seriesId,
            seriesVersion: payload.rematch.seriesVersion,
            status: 'pending',
            acceptedUserIds: payload.rematch.acceptedUserIds,
            expiresAt: payload.rematch.expiresAt,
          }
        : null,
      pendingCommandId: null,
      error: null,
      serverTimeOffsetMs: serverOffset(payload.serverNow),
    };
  }),

  setRematch: (payload) => set({ rematch: payload }),
  setCommandResult: (payload) => set((current) => ({
    lastCommandResult: payload,
    pendingCommandId: current.pendingCommandId === payload.commandId ? null : current.pendingCommandId,
  })),
  setTurnResolved: (payload) => set((current) => {
    if (isOlderState(current.state, payload.state)) return current;
    return {
      state: payload.state,
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
  requestSearchCancellation: () => set({ searchCancellationPending: true }),
  beginFreshSearch: () => set(resetGridState()),
  clear: () => set(resetGridState()),
}));
