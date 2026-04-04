import { create } from 'zustand';
import { logger } from '@/utils/logger';
import type { OpponentInfo } from '@/lib/realtime/socket.types';

interface RankedMatchmakingState {
  rankedSearchDurationMs: number | null;
  rankedSearchStartedAt: number | null;
  rankedFoundOpponent: OpponentInfo | null;
  rankedSearching: boolean;
  setRankedSearchStarted: (payload: { durationMs: number }) => void;
  setRankedMatchFound: (payload: { opponent: OpponentInfo }) => void;
  setRankedQueueLeft: () => void;
  clearRankedMatchmaking: () => void;
}

export const useRankedMatchmakingStore = create<RankedMatchmakingState>((set) => ({
  rankedSearchDurationMs: null,
  rankedSearchStartedAt: null,
  rankedFoundOpponent: null,
  rankedSearching: false,
  setRankedSearchStarted: ({ durationMs }) => {
    logger.info('Ranked matchmaking store set search started', { durationMs });
    set((state) => {
      const keepExistingStart = state.rankedSearching && state.rankedSearchStartedAt !== null;
      return {
        rankedSearchDurationMs: durationMs,
        rankedSearchStartedAt: keepExistingStart ? state.rankedSearchStartedAt : Date.now(),
        rankedFoundOpponent: null,
        rankedSearching: true,
      };
    });
  },
  setRankedMatchFound: ({ opponent }) => {
    logger.info('Ranked matchmaking store set match found', { opponentId: opponent.id });
    set({
      rankedFoundOpponent: opponent,
      rankedSearching: false,
    });
  },
  setRankedQueueLeft: () => {
    logger.info('Ranked matchmaking store set queue left');
    set({
      rankedSearchDurationMs: null,
      rankedSearchStartedAt: null,
      rankedFoundOpponent: null,
      rankedSearching: false,
    });
  },
  clearRankedMatchmaking: () => {
    logger.info('Ranked matchmaking store clear');
    set({
      rankedSearchDurationMs: null,
      rankedSearchStartedAt: null,
      rankedFoundOpponent: null,
      rankedSearching: false,
    });
  },
}));
