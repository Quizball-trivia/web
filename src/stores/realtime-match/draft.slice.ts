import type { StateCreator } from 'zustand';
import { logger } from '@/utils/logger';
import type { DraftBeginPayload, DraftState, DraftWaitingForReadyPayload } from '@/lib/realtime/socket.types';
import type { DraftStatus, RealtimeState } from './types';
import { computeNextDraftTurn } from './reducers';

/**
 * Draft / ban phase state. Owns the active draft snapshot. setDraftStart
 * additionally clears the presence-slice draft-pause fields (cross-slice
 * write — safe under Zustand's typed StateCreator since `set` accepts a
 * partial of the full RealtimeState).
 */
export interface DraftSlice {
  draft: DraftStatus | null;
  setDraftStart: (draft: DraftState) => void;
  setDraftWaitingForReady: (payload: DraftWaitingForReadyPayload) => void;
  setDraftBegin: (payload: DraftBeginPayload) => void;
  setDraftBan: (actorId: string, categoryId: string, forceAtMs?: number | null) => void;
  setDraftComplete: (halfOneCategoryId: string) => void;
  revertDraftBan: (actorId: string) => void;
}

export const draftInitialState = {
  draft: null,
} as const satisfies Pick<DraftSlice, 'draft'>;

export const createDraftSlice: StateCreator<RealtimeState, [], [], DraftSlice> = (set) => ({
  ...draftInitialState,

  setDraftStart: (draft) => {
    logger.info('Realtime store set draft start', {
      lobbyId: draft.lobbyId,
      categoryCount: draft.categories.length,
    });
    set((state) => ({
      draftPaused: false,
      draftPauseUntil: null,
      draftDisconnectedUserId: null,
      forfeitPending: null,
      draft: {
        lobbyId: draft.lobbyId,
        categories: draft.categories,
        bans: state.draft?.lobbyId === draft.lobbyId ? state.draft.bans : {},
        turnUserId: draft.turnUserId,
        forceAtMs: draft.forceAtMs,
        turnAnchorMs: Date.now(),
        halfOneCategoryId: null,
        turnActive: draft.forceAtMs !== null,
        waitingForReady: null,
      },
    }));
  },

  setDraftWaitingForReady: (payload) =>
    set((state) => ({
      draft: state.draft?.lobbyId === payload.lobbyId
        ? { ...state.draft, turnActive: false, waitingForReady: payload }
        : state.draft,
    })),

  setDraftBegin: (payload) =>
    set((state) => ({
      draft: state.draft && (!payload.lobbyId || state.draft.lobbyId === payload.lobbyId)
        ? {
            ...state.draft,
            turnUserId: payload.turnUserId,
            forceAtMs: payload.forceAtMs,
            turnAnchorMs: Date.now(),
            turnActive: true,
            waitingForReady: null,
          }
        : state.draft,
    })),

  setDraftBan: (actorId, categoryId, forceAtMs) =>
    set((state) => {
      if (!state.draft) return state;
      const nextTurn = computeNextDraftTurn(state.lobby?.members, actorId);
      logger.info('Realtime store set draft ban', { actorId, categoryId, nextTurnUserId: nextTurn });
      return {
        draft: {
          ...state.draft,
          bans: { ...state.draft.bans, [actorId]: categoryId },
          turnUserId: nextTurn,
          forceAtMs,
          turnAnchorMs: Date.now(),
          turnActive: true,
          waitingForReady: null,
        },
      };
    }),

  setDraftComplete: (halfOneCategoryId) => {
    logger.info('Realtime store set draft complete', { halfOneCategoryId });
    set((state) => ({
      draft: state.draft
        ? {
            ...state.draft,
            halfOneCategoryId,
          }
        : null,
    }));
  },

  revertDraftBan: (actorId) =>
    set((state) => {
      if (!state.draft) return state;
      const remainingBans = { ...state.draft.bans };
      delete remainingBans[actorId];
      return {
        draft: { ...state.draft, bans: remainingBans, turnUserId: actorId },
      };
    }),
});
