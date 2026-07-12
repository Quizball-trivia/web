import type { StateCreator } from 'zustand';
import { logger } from '@/utils/logger';
import {
  trackMatchDisconnected,
  trackMatchForfeit,
  trackMatchReconnected,
} from '@/lib/analytics/game-events';
import type {
  DraftOpponentDisconnectedPayload,
  MatchForfeitPendingPayload,
  MatchPartyDropoutPayload,
  MatchRejoinAvailablePayload,
} from '@/lib/realtime/socket.types';
import type { ForfeitPendingStatus, PartyDropoutStatus, RealtimeState, RejoinMatchStatus } from './types';

/**
 * Presence / reconnect / disconnect UI state. Owns the pause + rejoin +
 * forfeit + draft-pause lifecycle. setForfeitPending clears the active
 * pause/rejoin window (so the forfeit modal supersedes the rejoin one) —
 * a cross-slice write that's safe via Zustand's full-store `set`.
 */
export interface PresenceSlice {
  matchPaused: boolean;
  pauseUntil: number | null;
  pausedAt: number | null;
  remainingReconnects: number | null;
  draftPaused: boolean;
  draftPauseUntil: number | null;
  draftDisconnectedUserId: string | null;
  rejoinMatch: RejoinMatchStatus | null;
  forfeitPending: ForfeitPendingStatus | null;
  partyDropout: PartyDropoutStatus | null;
  /**
   * Match the user intentionally left/forfeited. The AppShell auto-rejoin
   * effect must never pull them back into this match, even if a trailing
   * `match:rejoin_available` / `session:state` races in before the server
   * processes the leave. Manual rejoin via the banner stays possible.
   */
  autoRejoinSuppressedMatchId: string | null;
  setForfeitPending: (payload: MatchForfeitPendingPayload) => void;
  clearForfeitPending: () => void;
  setPartyDropout: (payload: MatchPartyDropoutPayload) => void;
  clearPartyDropout: () => void;
  setMatchPaused: (payload: { graceMs: number; remainingReconnects: number }) => void;
  clearMatchPaused: () => void;
  setDraftPaused: (payload: DraftOpponentDisconnectedPayload) => void;
  clearDraftPaused: () => void;
  setRejoinAvailable: (payload: MatchRejoinAvailablePayload) => void;
  clearRejoinAvailable: () => void;
  suppressAutoRejoin: (matchId: string) => void;
}

export const presenceInitialState = {
  matchPaused: false,
  pauseUntil: null,
  pausedAt: null,
  remainingReconnects: null,
  draftPaused: false,
  draftPauseUntil: null,
  draftDisconnectedUserId: null,
  rejoinMatch: null,
  forfeitPending: null,
  partyDropout: null,
  autoRejoinSuppressedMatchId: null,
} as const satisfies Pick<
  PresenceSlice,
  | 'matchPaused'
  | 'pauseUntil'
  | 'pausedAt'
  | 'remainingReconnects'
  | 'draftPaused'
  | 'draftPauseUntil'
  | 'draftDisconnectedUserId'
  | 'rejoinMatch'
  | 'forfeitPending'
  | 'partyDropout'
  | 'autoRejoinSuppressedMatchId'
>;

export const createPresenceSlice: StateCreator<RealtimeState, [], [], PresenceSlice> = (set) => ({
  ...presenceInitialState,

  setForfeitPending: (payload) => {
    logger.info('Realtime store set forfeit pending', {
      matchId: payload.matchId,
      reason: payload.reason,
    });
    try {
      trackMatchForfeit(payload.matchId, payload.reason ?? 'unknown');
    } catch {
      /* analytics best-effort */
    }
    set({
      forfeitPending: {
        ...payload,
        createdAt: Date.now(),
      },
      partyDropout: null,
      matchPaused: false,
      pauseUntil: null,
      pausedAt: null,
      remainingReconnects: null,
      rejoinMatch: null,
    });
  },

  clearForfeitPending: () => {
    logger.info('Realtime store clear forfeit pending');
    set({ forfeitPending: null });
  },

  setPartyDropout: (payload) => {
    logger.info('Realtime store set party dropout', {
      matchId: payload.matchId,
      reason: payload.reason,
    });
    set({
      partyDropout: {
        ...payload,
        createdAt: Date.now(),
      },
      matchPaused: false,
      pauseUntil: null,
      pausedAt: null,
      remainingReconnects: null,
      rejoinMatch: null,
      forfeitPending: null,
    });
  },

  clearPartyDropout: () => {
    logger.info('Realtime store clear party dropout');
    set({ partyDropout: null });
  },

  setMatchPaused: ({ graceMs, remainingReconnects }) => {
    logger.info('Realtime store set match paused', { graceMs, remainingReconnects });
    set((state) => {
      try {
        if (state.match) {
          trackMatchDisconnected(state.match.matchId, 0, state.match.currentQuestionPhase ?? undefined);
        }
      } catch {
        /* analytics best-effort */
      }
      return {
        matchPaused: true,
        pauseUntil: Date.now() + graceMs,
        pausedAt: Date.now(),
        remainingReconnects,
        match: state.match
          ? {
            ...state.match,
            waitingForReady: null,
          }
          : state.match,
      };
    });
  },

  clearMatchPaused: () => {
    logger.info('Realtime store clear match paused');
    set((state) => {
      try {
        if (state.match && state.matchPaused && state.pausedAt) {
          const downtimeSec = Math.max(0, Math.round((Date.now() - state.pausedAt) / 1000));
          trackMatchReconnected(state.match.matchId, downtimeSec);
        }
      } catch {
        /* analytics best-effort */
      }
      return {
        matchPaused: false,
        pauseUntil: null,
        pausedAt: null,
        remainingReconnects: null,
      };
    });
  },

  setDraftPaused: ({ lobbyId, opponentId, graceMs }) => {
    logger.info('Realtime store set draft paused', { lobbyId, opponentId, graceMs });
    set((state) => {
      if (state.draft?.lobbyId !== lobbyId && state.lobby?.lobbyId !== lobbyId) return state;
      return {
        draftPaused: true,
        draftPauseUntil: Date.now() + graceMs,
        draftDisconnectedUserId: opponentId,
      };
    });
  },

  clearDraftPaused: () => {
    logger.info('Realtime store clear draft paused');
    set((state) => ({
      draftPaused: false,
      draftPauseUntil: null,
      draftDisconnectedUserId: null,
      // Resume re-opens the UI-ready gate. Never expose or auto-fire the stale
      // pre-pause turn while waiting for the authoritative draft:begin.
      draft: state.draft
        ? { ...state.draft, forceAtMs: null, turnActive: false, turnAnchorMs: null }
        : null,
    }));
  },

  setRejoinAvailable: (payload) => {
    logger.info('Realtime store set rejoin available', {
      matchId: payload.matchId,
      mode: payload.mode,
      graceMs: payload.graceMs,
      remainingReconnects: payload.remainingReconnects,
    });
    set({
      rejoinMatch: {
        matchId: payload.matchId,
        mode: payload.mode,
        variant: payload.variant,
        opponent: payload.opponent,
        participants: payload.participants,
        graceMs: payload.graceMs,
        remainingReconnects: payload.remainingReconnects,
        createdAt: Date.now(),
      },
      partyDropout: null,
    });
  },

  clearRejoinAvailable: () => {
    logger.info('Realtime store clear rejoin available');
    set({ rejoinMatch: null });
  },

  suppressAutoRejoin: (matchId) => {
    logger.info('Realtime store suppress auto-rejoin', { matchId });
    set({ autoRejoinSuppressedMatchId: matchId });
  },
});
