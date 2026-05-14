import { create } from 'zustand';
import { logger } from '@/utils/logger';
import type { OpponentInfo } from '@/lib/realtime/socket.types';

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
    set({
      rankedFoundOpponent: opponent,
      rankedFoundMyRecentForm: myRecentForm ?? null,
      rankedSearching: false,
    });
  },
  setRankedQueueLeft: () => {
    logger.info('Ranked matchmaking store set queue left');
    set({
      rankedSearchDurationMs: null,
      rankedSearchStartedAt: null,
      rankedFoundOpponent: null,
      rankedFoundMyRecentForm: null,
      rankedSearching: false,
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
