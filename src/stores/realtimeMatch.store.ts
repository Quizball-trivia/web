/**
 * Realtime match store — assembly shell.
 *
 * The actual state + actions live in sibling slice files under
 * `./realtime-match/`, each owning a single concern. This file's only
 * job is to compose them into the single `useRealtimeMatchStore`
 * hook that the rest of the app already imports from
 * `@/stores/realtimeMatch.store`, and to re-export the public types
 * so existing consumer `import type { MatchStatus, ... }` statements
 * keep resolving.
 *
 *   - realtime-match/types.ts          shared type defs
 *   - realtime-match/reducers.ts       pure helpers (no I/O)
 *   - realtime-match/lobby.slice.ts    lobby / matchmaking / session
 *   - realtime-match/draft.slice.ts    draft / ban phase
 *   - realtime-match/presence.slice.ts pause / rejoin / forfeit
 *   - realtime-match/match.slice.ts    active match (possession + party)
 *
 * The tiny `error` field + `setError` / `clearError` / `reset` stay
 * inline — splitting them off would add a file with less logic than
 * the import line costs. `reset` lives here because it spans all
 * slices and rebuilds from a single `initialState` constant.
 */
import { create } from 'zustand';
import { logger } from '@/utils/logger';
import type { SessionStatePayload } from '@/lib/realtime/socket.types';
import { createDraftSlice, draftInitialState } from './realtime-match/draft.slice';
import { createLobbySlice, lobbyInitialState } from './realtime-match/lobby.slice';
import { createMatchSlice, matchInitialState } from './realtime-match/match.slice';
import { createPresenceSlice, presenceInitialState } from './realtime-match/presence.slice';
import type { RealtimeState } from './realtime-match/types';

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
