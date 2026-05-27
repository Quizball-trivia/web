import { create } from 'zustand';
import { logger } from '@/utils/logger';
import type { SessionStatePayload } from '@/lib/realtime/socket.types';
import type {
  DraftStatus,
  ForfeitPendingStatus,
  LobbyBannerSuppressionReason,
  LobbyChallengeInvite,
  MatchQuestionState,
  MatchStatus,
  RealtimeState,
  RejoinMatchStatus,
} from './realtime-match/types';
import { createDraftSlice, draftInitialState } from './realtime-match/draft.slice';
import { createLobbySlice, lobbyInitialState } from './realtime-match/lobby.slice';
import { createMatchSlice, matchInitialState } from './realtime-match/match.slice';
import { createPresenceSlice, presenceInitialState } from './realtime-match/presence.slice';

// Re-export public types so existing consumer imports keep resolving
// (`import type { MatchStatus, DraftStatus, ... } from '@/stores/realtimeMatch.store'`).
export type {
  DevPossessionAnimation,
  DraftStatus,
  ForfeitPendingStatus,
  LobbyBannerSuppressionReason,
  LobbyChallengeInvite,
  MatchQuestionState,
  MatchStatus,
  RealtimeState,
  RejoinMatchStatus,
} from './realtime-match/types';

const initialState = {
  ...lobbyInitialState,
  ...draftInitialState,
  ...presenceInitialState,
  ...matchInitialState,
  error: null,
};

export const useRealtimeMatchStore = create<RealtimeState>()((...args) => {
  const [set] = args;
  return {
  ...initialState,
  ...createLobbySlice(...args),
  ...createDraftSlice(...args),
  ...createPresenceSlice(...args),
  ...createMatchSlice(...args),
  setError: (error) => {
    const snapshot = (error.meta as { stateSnapshot?: SessionStatePayload } | undefined)?.stateSnapshot;
    logger.warn('Realtime store set error', {
      code: error.code,
      message: error.message,
      source: (error.meta as { source?: string } | undefined)?.source ?? null,
      reason: (error.meta as { reason?: string } | undefined)?.reason ?? null,
      operation: (error.meta as { operation?: string | null } | undefined)?.operation ?? null,
      sessionState: snapshot?.state ?? null,
      waitingLobbyId: snapshot?.waitingLobbyId ?? null,
      activeMatchId: snapshot?.activeMatchId ?? null,
      queueSearchId: snapshot?.queueSearchId ?? null,
    });
    set({ error });
  },
  clearError: () => set({ error: null }),
  reset: () => {
    logger.info('Realtime store reset');
    // Keep identity across UI resets so round-result mapping remains stable.
    set((state) => ({ ...initialState, selfUserId: state.selfUserId }));
  },
  };
});
