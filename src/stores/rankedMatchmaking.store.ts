import { create } from 'zustand';
import { logger } from '@/utils/logger';
import type { OpponentInfo } from '@/lib/realtime/socket.types';
import {
  trackMatchmakingStarted,
  trackMatchmakingHumanFound,
  trackMatchmakingAiFallback,
  trackMatchmakingCancelled,
} from '@/lib/analytics/game-events';

interface RankedMatchmakingState {
  rankedSearchDurationMs: number | null;
  rankedSearchStartedAt: number | null;
  rankedFoundOpponent: OpponentInfo | null;
  rankedFoundMyRecentForm: Array<'W' | 'L' | 'D'> | null;
  rankedSearching: boolean;
  setRankedSearchStarted: (payload: { durationMs: number }) => void;
  setRankedMatchFound: (payload: { opponent: OpponentInfo; myRecentForm?: Array<'W' | 'L' | 'D'> }) => void;
  setRankedQueueLeft: () => void;
  clearRankedMatchmaking: () => void;
}

export const useRankedMatchmakingStore = create<RankedMatchmakingState>((set) => ({
  rankedSearchDurationMs: null,
  rankedSearchStartedAt: null,
  rankedFoundOpponent: null,
  rankedFoundMyRecentForm: null,
  rankedSearching: false,
  setRankedSearchStarted: ({ durationMs }) => {
    logger.info('Ranked matchmaking store set search started', { durationMs });
    set((state) => {
      const keepExistingStart = state.rankedSearching && state.rankedSearchStartedAt !== null;
      if (!keepExistingStart) {
        try {
          trackMatchmakingStarted('ranked');
        } catch (error) {
          logger.error('Analytics trackMatchmakingStarted failed', error);
        }
      }
      return {
        rankedSearchDurationMs: durationMs,
        rankedSearchStartedAt: keepExistingStart ? state.rankedSearchStartedAt : Date.now(),
        rankedFoundOpponent: null,
        rankedFoundMyRecentForm: null,
        rankedSearching: true,
      };
    });
  },
  setRankedMatchFound: ({ opponent, myRecentForm }) => {
    logger.info('Ranked matchmaking store set match found', { opponentId: opponent.id, formLen: myRecentForm?.length ?? 0 });
    set((state) => {
      const waitMs = state.rankedSearchStartedAt ? Date.now() - state.rankedSearchStartedAt : 0;
      // Prefer an explicit isAiOpponent field when the backend provides it;
      // fall back to a UUID-regex heuristic on the id otherwise. TODO: have
      // backend always set isAiOpponent on the match_found payload so this
      // branch can drop the regex.
      const explicitFlag = (opponent as { isAiOpponent?: boolean }).isAiOpponent;
      const isAiOpponent = typeof explicitFlag === 'boolean'
        ? explicitFlag
        : !/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(opponent.id ?? '');
      try {
        if (isAiOpponent) {
          trackMatchmakingAiFallback('ranked', waitMs);
        } else {
          trackMatchmakingHumanFound('ranked', waitMs);
        }
      } catch (error) {
        logger.error('Analytics matchmaking-found event failed', error);
      }
      return {
        rankedFoundOpponent: opponent,
        rankedFoundMyRecentForm: myRecentForm ?? null,
        rankedSearching: false,
      };
    });
  },
  setRankedQueueLeft: () => {
    logger.info('Ranked matchmaking store set queue left');
    set((state) => {
      const waitMs = state.rankedSearchStartedAt ? Date.now() - state.rankedSearchStartedAt : 0;
      if (state.rankedSearching) {
        try {
          trackMatchmakingCancelled('ranked', waitMs);
        } catch (error) {
          logger.error('Analytics trackMatchmakingCancelled failed', error);
        }
      }
      return {
        rankedSearchDurationMs: null,
        rankedSearchStartedAt: null,
        rankedFoundOpponent: null,
        rankedFoundMyRecentForm: null,
        rankedSearching: false,
      };
    });
  },
  clearRankedMatchmaking: () => {
    logger.info('Ranked matchmaking store clear');
    set({
      rankedSearchDurationMs: null,
      rankedSearchStartedAt: null,
      rankedFoundOpponent: null,
      rankedFoundMyRecentForm: null,
      rankedSearching: false,
    });
  },
}));
