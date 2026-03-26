import { create } from 'zustand';
import { logger } from '@/utils/logger';
import type {
  DraftCategory,
  DraftState,
  LobbyState,
  MatchAnswerAckPayload,
  MatchChanceCardAppliedPayload,
  MatchFinalResultsPayload,
  MatchPartyStatePayload,
  MatchRejoinAvailablePayload,
  MatchParticipant,
  MatchStatePayload,
  MatchVariant,
  ResolvedMatchQuestionPayload,
  MatchRoundResultPayload,
  MatchCountdownPayload,
  MatchStartPayload,
  OpponentInfo,
  ErrorPayload,
  WarmupStatePayload,
  WarmupTappedPayload,
  WarmupOverPayload,
  WarmupRestartedPayload,
  WarmupScoresPayload,
  PresenceOnlineCountPayload,
  SessionStatePayload,
} from '@/lib/realtime/socket.types';

/** Client-side fallback countdown until the server's match:countdown event arrives with the real value. */
const DEFAULT_COUNTDOWN_MS = 5000;

export interface DraftStatus {
  lobbyId: string;
  categories: DraftCategory[];
  bans: Record<string, string>;
  turnUserId: string | null;
  halfOneCategoryId: string | null;
}

export interface MatchQuestionState {
  payload: ResolvedMatchQuestionPayload;
  correctIndex?: number;
}

export interface MatchStatus {
  matchId: string;
  mode: 'friendly' | 'ranked';
  variant: MatchVariant;
  mySeat: number | null;
  opponent: OpponentInfo;
  participants: MatchParticipant[];
  countdownEndsAt: number | null;
  currentQuestion: ResolvedMatchQuestionPayload | null;
  pendingQuestion: ResolvedMatchQuestionPayload | null;
  questions: Record<number, MatchQuestionState>;
  answerAck: MatchAnswerAckPayload | null;
  opponentAnswered: boolean;
  opponentSelectedIndex: number | null;
  myTotalPoints: number;
  oppTotalPoints: number;
  opponentRecentPoints: number;
  lastRoundResult: MatchRoundResultPayload | null;
  finalResults: MatchFinalResultsPayload | null;
  currentQuestionPhase: 'reveal' | 'playing';
  opponentAnsweredCorrectly: boolean | null;
  possessionState: MatchStatePayload | null;
  partyState: MatchPartyStatePayload | null;
  stateVersion: number;
  optimisticChanceCard: OptimisticChanceCardState | null;
}

export interface OptimisticChanceCardState {
  qIndex: number;
  clientActionId: string;
  eliminatedIndices: number[];
  pending: boolean;
  pendingSync: boolean;
  rollbackSnapshot: {
    eliminatedIndices: number[];
    remainingQuantityBefore: number | null;
  };
  remainingQuantityAfter: number | null;
}

export interface WarmupStatus {
  bounceCount: number;
  nextTurnUserId: string;
  active: boolean;
  lastTapperId: string | null;
  lastTapX: number | null;
  lastTapY: number | null;
  playerBest: number;
  pairBest: number;
  gameOver: boolean;
  finalScore: number | null;
  isNewPlayerBest: boolean;
  isNewPairBest: boolean;
}

export interface RejoinMatchStatus {
  matchId: string;
  mode: 'friendly' | 'ranked';
  variant: MatchVariant;
  opponent: OpponentInfo;
  participants: MatchParticipant[];
  graceMs: number;
  createdAt: number;
}

export interface DevPossessionAnimation {
  id: number;
  result: 'goal' | 'saved' | 'miss';
  attackerSeat: 1 | 2;
}

interface RealtimeState {
  lobby: LobbyState | null;
  draft: DraftStatus | null;
  match: MatchStatus | null;
  warmup: WarmupStatus | null;
  onlineUsers: number | null;
  sessionState: SessionStatePayload | null;
  selfUserId: string | null;
  matchPaused: boolean;
  pauseUntil: number | null;
  rankedSearchDurationMs: number | null;
  rankedSearchStartedAt: number | null;
  rankedFoundOpponent: OpponentInfo | null;
  rankedSearching: boolean;
  rejoinMatch: RejoinMatchStatus | null;
  devPossessionAnimation: DevPossessionAnimation | null;
  error: ErrorPayload | null;
  setSelfUserId: (userId: string | null) => void;
  setLobby: (lobby: LobbyState) => void;
  setDraftStart: (draft: DraftState) => void;
  setDraftBan: (actorId: string, categoryId: string) => void;
  setDraftComplete: (halfOneCategoryId: string) => void;
  setMatchStart: (payload: MatchStartPayload) => void;
  setMatchCountdown: (payload: MatchCountdownPayload) => void;
  setMatchQuestion: (payload: ResolvedMatchQuestionPayload) => void;
  promotePendingQuestion: () => void;
  setMatchState: (payload: MatchStatePayload) => void;
  setPartyState: (payload: MatchPartyStatePayload) => void;
  setAnswerAck: (payload: MatchAnswerAckPayload) => void;
  setOpponentAnswered: (payload?: {
    matchId?: string;
    qIndex?: number;
    opponentTotalPoints?: number;
    pointsEarned?: number;
    isCorrect?: boolean;
    selectedIndex?: number | null;
  }) => void;
  setQuestionPhase: (phase: 'reveal' | 'playing') => void;
  applyOptimisticChanceCard: (payload: {
    qIndex: number;
    clientActionId: string;
    eliminatedIndices: number[];
    remainingQuantityBefore: number | null;
  }) => void;
  markOptimisticChanceCardPendingSync: (payload: { qIndex: number; clientActionId: string }) => void;
  confirmOptimisticChanceCard: (payload: MatchChanceCardAppliedPayload) => void;
  rollbackOptimisticChanceCard: (payload?: { qIndex?: number; clientActionId?: string }) => void;
  setRoundResult: (payload: MatchRoundResultPayload) => void;
  setFinalResults: (payload: MatchFinalResultsPayload) => void;
  setMatchPaused: (payload: { graceMs: number }) => void;
  clearMatchPaused: () => void;
  setRankedSearchStarted: (payload: { durationMs: number }) => void;
  setRankedMatchFound: (payload: { opponent: OpponentInfo }) => void;
  setRankedQueueLeft: () => void;
  clearRankedMatchmaking: () => void;
  setRejoinAvailable: (payload: MatchRejoinAvailablePayload) => void;
  clearRejoinAvailable: () => void;
  setWarmupState: (data: WarmupStatePayload) => void;
  setWarmupTapped: (data: WarmupTappedPayload) => void;
  setWarmupOver: (data: WarmupOverPayload) => void;
  setWarmupRestarted: (data: WarmupRestartedPayload) => void;
  setWarmupScores: (data: WarmupScoresPayload) => void;
  setOnlineUsers: (data: PresenceOnlineCountPayload) => void;
  clearWarmup: () => void;
  setSessionState: (payload: SessionStatePayload) => void;
  revertDraftBan: (actorId: string) => void;
  triggerDevPossessionAnimation: (payload: { result: 'goal' | 'saved' | 'miss'; attackerSeat: 1 | 2 }) => void;
  clearDevPossessionAnimation: () => void;
  exitCompletedMatchToLobby: () => void;
  setError: (error: ErrorPayload) => void;
  clearError: () => void;
  reset: () => void;
}

const initialState = {
  lobby: null,
  draft: null,
  match: null,
  warmup: null,
  onlineUsers: null,
  sessionState: null,
  selfUserId: null,
  matchPaused: false,
  pauseUntil: null,
  rankedSearchDurationMs: null,
  rankedSearchStartedAt: null,
  rankedFoundOpponent: null,
  rankedSearching: false,
  rejoinMatch: null,
  devPossessionAnimation: null,
  error: null,
};

export const useRealtimeMatchStore = create<RealtimeState>((set, get) => ({
  ...initialState,
  setSelfUserId: (userId) => {
    logger.info('Realtime store set self user id', { selfUserId: userId });
    set({ selfUserId: userId });
  },
  setLobby: (lobby) => {
    logger.info('Realtime store set lobby', {
      lobbyId: lobby.lobbyId,
      status: lobby.status,
      memberCount: lobby.members.length,
    });
    set({ lobby });
  },
  setDraftStart: (draft) => {
    logger.info('Realtime store set draft start', {
      lobbyId: draft.lobbyId,
      categoryCount: draft.categories.length,
    });
    set({
      draft: {
        lobbyId: draft.lobbyId,
        categories: draft.categories,
        bans: {},
        turnUserId: draft.turnUserId,
        halfOneCategoryId: null,
      },
    });
  },
  setDraftBan: (actorId, categoryId) =>
    set((state) => {
      if (!state.draft) return state;
      const nextTurn = state.lobby?.members.find((m) => m.userId !== actorId)?.userId ?? null;
      logger.info('Realtime store set draft ban', { actorId, categoryId, nextTurnUserId: nextTurn });
      return {
        ...state,
        draft: {
          ...state.draft,
          bans: { ...state.draft.bans, [actorId]: categoryId },
          turnUserId: nextTurn,
        },
      };
    }),
  setDraftComplete: (halfOneCategoryId) => {
    logger.info('Realtime store set draft complete', { halfOneCategoryId });
    set((state) => ({
      ...state,
      draft: state.draft
        ? {
            ...state.draft,
            halfOneCategoryId,
          }
        : null,
    }));
  },
  setMatchStart: (payload) => {
    logger.info('Realtime store set match start', { matchId: payload.matchId, opponentId: payload.opponent.id });
    set({
      lobby: null,
      draft: null,
      warmup: null,
      matchPaused: false,
      pauseUntil: null,
      rankedSearchDurationMs: null,
      rankedSearchStartedAt: null,
      rankedFoundOpponent: null,
      rejoinMatch: null,
      match: {
        matchId: payload.matchId,
        mode: payload.mode,
        variant: payload.variant,
        mySeat: payload.mySeat ?? null,
        opponent: payload.opponent,
        participants: payload.participants,
        countdownEndsAt: Date.now() + DEFAULT_COUNTDOWN_MS,
        currentQuestion: null,
        pendingQuestion: null,
        questions: {},
        answerAck: null,
        opponentAnswered: false,
        opponentSelectedIndex: null,
        myTotalPoints: 0,
        oppTotalPoints: 0,
        opponentRecentPoints: 0,
        lastRoundResult: null,
        finalResults: null,
        currentQuestionPhase: 'reveal',
        opponentAnsweredCorrectly: null,
        possessionState: null,
        partyState: null,
        stateVersion: 0,
        optimisticChanceCard: null,
      },
    });
  },
  setMatchCountdown: (payload) => {
    logger.info('Realtime store set match countdown', {
      matchId: payload.matchId,
      seconds: payload.seconds,
      startsAt: payload.startsAt,
    });
    set((state) => {
      if (!state.match || state.match.matchId !== payload.matchId) return state;
      const startsAtMs = Number.isFinite(new Date(payload.startsAt).getTime())
        ? new Date(payload.startsAt).getTime()
        : Date.now() + Math.max(0, payload.seconds) * 1000;
      return {
        ...state,
        match: {
          ...state.match,
          countdownEndsAt: startsAtMs,
        },
      };
    });
  },
  setMatchState: (payload) => {
    logger.info('Realtime store set match state', {
      matchId: payload.matchId,
      phase: payload.phase,
      half: payload.half,
      possessionDiff: payload.possessionDiff,
      phaseKind: payload.phaseKind,
      phaseRound: payload.phaseRound,
      stateVersion: payload.stateVersion,
    });
    set((state) => {
      if (!state.match || state.match.matchId !== payload.matchId) return state;
      // Reject out-of-order state events via stateVersion
      const incomingVersion = payload.stateVersion ?? 0;
      if (incomingVersion > 0 && incomingVersion <= state.match.stateVersion) {
        logger.warn('Ignoring stale match:state event', {
          incoming: incomingVersion,
          current: state.match.stateVersion,
        });
        return state;
      }
      
      const shouldClearQuestion =
        (payload.phase === 'COMPLETED' || payload.phase === 'HALFTIME')
        && !state.match.lastRoundResult;
      const shouldClearCountdown =
        payload.phase !== 'NORMAL_PLAY' ||
        payload.normalQuestionsAnsweredInHalf > 0 ||
        payload.phaseRound > 1;
      return {
        ...state,
        match: {
          ...state.match,
          possessionState: payload,
          stateVersion: incomingVersion > 0 ? incomingVersion : state.match.stateVersion,
          countdownEndsAt: shouldClearCountdown ? null : state.match.countdownEndsAt,
          currentQuestion: shouldClearQuestion ? null : state.match.currentQuestion,
          pendingQuestion: shouldClearQuestion ? null : state.match.pendingQuestion,
          answerAck: shouldClearQuestion ? null : state.match.answerAck,
          lastRoundResult: shouldClearQuestion ? null : state.match.lastRoundResult,
          opponentAnswered: shouldClearQuestion ? false : state.match.opponentAnswered,
          opponentSelectedIndex: shouldClearQuestion ? null : state.match.opponentSelectedIndex,
          opponentRecentPoints: shouldClearQuestion ? 0 : state.match.opponentRecentPoints,
          opponentAnsweredCorrectly: shouldClearQuestion ? null : state.match.opponentAnsweredCorrectly,
          currentQuestionPhase: shouldClearQuestion ? 'reveal' : state.match.currentQuestionPhase,
          optimisticChanceCard: shouldClearQuestion ? null : state.match.optimisticChanceCard,
        },
      };
    });
  },
  setPartyState: (payload) => {
    logger.info('Realtime store set party state', {
      matchId: payload.matchId,
      currentQuestionIndex: payload.currentQuestionIndex,
      leaderUserId: payload.leaderUserId,
      stateVersion: payload.stateVersion,
    });
    set((state) => {
      if (!state.match || state.match.matchId !== payload.matchId) return state;
      const incomingVersion = payload.stateVersion ?? 0;
      const currentVersion = state.match.stateVersion;
      if (currentVersion > 0 && incomingVersion > 0 && incomingVersion <= currentVersion) {
        logger.warn('Ignoring stale match:party_state event', {
          incoming: incomingVersion,
          current: currentVersion,
        });
        return state;
      }

      const selfUserId = state.selfUserId;
      const myPlayer = selfUserId
        ? payload.players.find((player) => player.userId === selfUserId)
        : undefined;
      const firstOpponent = selfUserId
        ? payload.players.find((player) => player.userId !== selfUserId)
        : payload.players[0];

      return {
        ...state,
        match: {
          ...state.match,
          partyState: payload,
          stateVersion: incomingVersion > 0 ? incomingVersion : state.match.stateVersion,
          myTotalPoints: myPlayer?.totalPoints ?? state.match.myTotalPoints,
          oppTotalPoints: firstOpponent?.totalPoints ?? state.match.oppTotalPoints,
        },
      };
    });
  },
  setMatchQuestion: (payload) => {
    logger.info('Realtime store set match question', {
      matchId: payload.matchId,
      qIndex: payload.qIndex,
      correctIndex: payload.correctIndex,
      questionPrompt: payload.question.prompt,
      questionPromptPreview: payload.question.prompt?.substring(0, 50) + '...',
    });
    set((state) => {
      if (!state.match) return state;
      if (state.match.matchId !== payload.matchId) {
        logger.warn('Ignoring mismatched match:question event', {
          activeMatchId: state.match.matchId,
          payloadMatchId: payload.matchId,
        });
        return state;
      }
      // Guard: ignore stale/out-of-order question events
      const currentQIndex = state.match.currentQuestion?.qIndex ?? -1;
      if (payload.qIndex <= currentQIndex) {
        logger.warn('Ignoring stale match:question event', {
          received: payload.qIndex,
          current: currentQIndex,
        });
        return state;
      }

      // Buffer question if we're still showing the last round result.
      // Exception: when server state is HALFTIME, accept question immediately to avoid
      // getting stuck if phase transition and question packets arrive out of order.
      if (state.match.lastRoundResult && state.match.possessionState?.phase !== 'HALFTIME') {
        logger.info('Buffering match:question as pendingQuestion (result still showing)', {
          qIndex: payload.qIndex,
        });
        return {
          ...state,
          match: {
            ...state.match,
            pendingQuestion: payload,
            countdownEndsAt: payload.qIndex > 0 ? null : state.match.countdownEndsAt,
            questions: {
              ...state.match.questions,
              [payload.qIndex]: {
                payload,
                correctIndex: payload.correctIndex ?? state.match.questions[payload.qIndex]?.correctIndex,
              },
            },
          },
        };
      }

      logger.info('Store updated with new question', {
        qIndex: payload.qIndex,
        prompt: payload.question.prompt,
        options: payload.question.options,
        categoryName: payload.question.categoryName,
      });

      return {
        ...state,
        match: {
          ...state.match,
          currentQuestion: payload,
          pendingQuestion: null,
          countdownEndsAt: payload.qIndex > 0 ? null : state.match.countdownEndsAt,
          answerAck: null,
          opponentAnswered: false,
          opponentSelectedIndex: null,
          opponentRecentPoints: 0,
          lastRoundResult: null,
          currentQuestionPhase: 'reveal',
          opponentAnsweredCorrectly: null,
          optimisticChanceCard: null,
          questions: {
            ...state.match.questions,
            [payload.qIndex]: {
              payload,
              correctIndex: payload.correctIndex ?? state.match.questions[payload.qIndex]?.correctIndex,
            },
          },
        },
      };
    });
  },
  promotePendingQuestion: () => {
    set((state) => {
      if (!state.match || !state.match.pendingQuestion) return state;
      const pending = state.match.pendingQuestion;
      logger.info('Promoting pending question to current', { qIndex: pending.qIndex });
      return {
        ...state,
        match: {
          ...state.match,
          currentQuestion: pending,
          pendingQuestion: null,
          countdownEndsAt: pending.qIndex > 0 ? null : state.match.countdownEndsAt,
          answerAck: null,
          opponentAnswered: false,
          opponentSelectedIndex: null,
          opponentRecentPoints: 0,
          lastRoundResult: null,
          currentQuestionPhase: 'reveal',
          opponentAnsweredCorrectly: null,
          optimisticChanceCard: null,
        },
      };
    });
  },
  setAnswerAck: (payload) => {
    logger.info('Realtime store set answer ack', {
      matchId: payload.matchId,
      qIndex: payload.qIndex,
      isCorrect: payload.isCorrect,
    });
    set((state) => {
      if (!state.match) return state;
      if (state.match.matchId !== payload.matchId) {
        logger.warn('Ignoring mismatched match:answer_ack event', {
          activeMatchId: state.match.matchId,
          payloadMatchId: payload.matchId,
        });
        return state;
      }
      const currentQIndex = state.match.currentQuestion?.qIndex;
      if (currentQIndex !== undefined && payload.qIndex !== currentQIndex) {
        logger.warn('Ignoring stale match:answer_ack event', {
          received: payload.qIndex,
          current: currentQIndex,
        });
        return state;
      }
      const existing = state.match.questions[payload.qIndex];
      const fallbackQuestion = existing?.payload ?? state.match.currentQuestion;
      if (!fallbackQuestion) return state;
      return {
        ...state,
        match: {
          ...state.match,
          answerAck: payload,
          myTotalPoints: payload.myTotalPoints,
          opponentAnswered: payload.oppAnswered,
          questions: {
            ...state.match.questions,
            [payload.qIndex]: {
              payload: fallbackQuestion,
              correctIndex: payload.correctIndex,
            },
          },
        },
      };
    });
  },
  setOpponentAnswered: (payload) => {
    logger.info('Realtime store set opponent answered', payload);
    set((state) => {
      if (!state.match) return state;
      if (payload?.matchId && state.match.matchId !== payload.matchId) {
        logger.warn('Ignoring mismatched match:opponent_answered event', {
          activeMatchId: state.match.matchId,
          payloadMatchId: payload.matchId,
        });
        return state;
      }
      const currentQIndex = state.match.currentQuestion?.qIndex;
      if (payload?.qIndex !== undefined && currentQIndex !== undefined && payload.qIndex !== currentQIndex) {
        logger.warn('Ignoring stale match:opponent_answered event', {
          received: payload.qIndex,
          current: currentQIndex,
        });
        return state;
      }
      return {
        ...state,
        match: {
          ...state.match,
          opponentAnswered: true,
          opponentSelectedIndex: payload?.selectedIndex ?? state.match.opponentSelectedIndex,
          oppTotalPoints: payload?.opponentTotalPoints ?? state.match.oppTotalPoints,
          opponentRecentPoints:
            payload?.pointsEarned !== undefined ? payload.pointsEarned : state.match.opponentRecentPoints,
          opponentAnsweredCorrectly:
            payload?.isCorrect !== undefined ? payload.isCorrect : state.match.opponentAnsweredCorrectly,
        },
      };
    });
  },
  setQuestionPhase: (phase) => {
    logger.info('Realtime store set question phase', { phase });
    set((state) => {
      if (!state.match) return state;
      return {
        ...state,
        match: {
          ...state.match,
          currentQuestionPhase: phase,
        },
      };
    });
  },
  applyOptimisticChanceCard: (payload) => {
    logger.info('Realtime store apply optimistic 50-50 card', payload);
    set((state) => {
      if (!state.match) return state;
      const currentQIndex = state.match.currentQuestion?.qIndex;
      if (currentQIndex === undefined || currentQIndex !== payload.qIndex) return state;

      return {
        ...state,
        match: {
          ...state.match,
          optimisticChanceCard: {
            qIndex: payload.qIndex,
            clientActionId: payload.clientActionId,
            eliminatedIndices: payload.eliminatedIndices,
            pending: true,
            pendingSync: false,
            rollbackSnapshot: {
              eliminatedIndices: payload.eliminatedIndices,
              remainingQuantityBefore: payload.remainingQuantityBefore,
            },
            remainingQuantityAfter: null,
          },
        },
      };
    });
  },
  markOptimisticChanceCardPendingSync: (payload) => {
    set((state) => {
      if (!state.match?.optimisticChanceCard) return state;
      const optimistic = state.match.optimisticChanceCard;
      if (optimistic.qIndex !== payload.qIndex || optimistic.clientActionId !== payload.clientActionId || !optimistic.pending) {
        return state;
      }
      return {
        ...state,
        match: {
          ...state.match,
          optimisticChanceCard: {
            ...optimistic,
            pending: false,
            pendingSync: true,
          },
        },
      };
    });
  },
  confirmOptimisticChanceCard: (payload) => {
    logger.info('Realtime store confirm 50-50 card', payload);
    set((state) => {
      if (!state.match) return state;
      const optimistic = state.match.optimisticChanceCard;
      if (!optimistic) return state;
      if (optimistic.qIndex !== payload.qIndex) return state;
      if (optimistic.clientActionId !== payload.clientActionId) return state;

      return {
        ...state,
        match: {
          ...state.match,
          optimisticChanceCard: {
            ...optimistic,
            eliminatedIndices: payload.eliminatedIndices,
            pending: false,
            pendingSync: false,
            remainingQuantityAfter: payload.remainingQuantity,
          },
        },
      };
    });
  },
  rollbackOptimisticChanceCard: (payload) => {
    logger.warn('Realtime store rollback optimistic 50-50 card', payload);
    set((state) => {
      if (!state.match?.optimisticChanceCard) return state;
      const optimistic = state.match.optimisticChanceCard;
      if (payload?.qIndex !== undefined && optimistic.qIndex !== payload.qIndex) return state;
      if (payload?.clientActionId && optimistic.clientActionId !== payload.clientActionId) return state;
      return {
        ...state,
        match: {
          ...state.match,
          optimisticChanceCard: null,
        },
      };
    });
  },
  setRoundResult: (payload) => {
    logger.info('Realtime store set round result', { matchId: payload.matchId, qIndex: payload.qIndex });
    set((state) => {
      if (!state.match) return state;
      if (state.match.matchId !== payload.matchId) {
        logger.warn('Ignoring mismatched match:round_result event', {
          activeMatchId: state.match.matchId,
          payloadMatchId: payload.matchId,
        });
        return state;
      }
      const currentQIndex = state.match.currentQuestion?.qIndex;
      if (currentQIndex !== undefined && payload.qIndex !== currentQIndex) {
        logger.warn('Ignoring stale match:round_result event', {
          received: payload.qIndex,
          current: currentQIndex,
        });
        return state;
      }
      const existing = state.match.questions[payload.qIndex];
      const fallbackQuestion = existing?.payload ?? state.match.currentQuestion;
      if (!fallbackQuestion) return state;
      const myId = state.selfUserId;
      const myTotals = myId ? payload.players[myId] : undefined;
      const opponentTotals = myId
        ? Object.entries(payload.players).find(([userId]) => userId !== myId)?.[1]
        : undefined;
      return {
        ...state,
        match: {
          ...state.match,
          lastRoundResult: payload,
          myTotalPoints: myTotals?.totalPoints ?? state.match.myTotalPoints,
          oppTotalPoints: opponentTotals?.totalPoints ?? state.match.oppTotalPoints,
          optimisticChanceCard: null,
          questions: {
            ...state.match.questions,
            [payload.qIndex]: {
              payload: fallbackQuestion,
              correctIndex: payload.correctIndex,
            },
          },
        },
      };
    });
  },
  setFinalResults: (payload) => {
    logger.info('Realtime store set final results', { matchId: payload.matchId, winnerId: payload.winnerId });
    set((state) => {
      if (!state.match) return state;
      if (state.match.matchId !== payload.matchId) {
        logger.warn('Ignoring mismatched match:final_results event', {
          activeMatchId: state.match.matchId,
          payloadMatchId: payload.matchId,
        });
        return state;
      }
      return {
        ...state,
        matchPaused: false,
        pauseUntil: null,
        rejoinMatch: null,
        match: {
          ...state.match,
          finalResults: payload,
          optimisticChanceCard: null,
        },
      };
    });
  },
  setMatchPaused: ({ graceMs }) => {
    logger.info('Realtime store set match paused', { graceMs });
    set({
      matchPaused: true,
      pauseUntil: Date.now() + graceMs,
    });
  },
  clearMatchPaused: () => {
    logger.info('Realtime store clear match paused');
    set({
      matchPaused: false,
      pauseUntil: null,
    });
  },
  setRankedSearchStarted: ({ durationMs }) => {
    logger.info('Realtime store set ranked search started', { durationMs });
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
    logger.info('Realtime store set ranked match found', { opponentId: opponent.id });
    set({
      rankedFoundOpponent: opponent,
      rankedSearching: false,
    });
  },
  setRankedQueueLeft: () => {
    logger.info('Realtime store set ranked queue left');
    set({
      rankedSearchDurationMs: null,
      rankedSearchStartedAt: null,
      rankedFoundOpponent: null,
      rankedSearching: false,
    });
  },
  clearRankedMatchmaking: () => {
    logger.info('Realtime store clear ranked matchmaking');
    set({
      rankedSearchDurationMs: null,
      rankedSearchStartedAt: null,
      rankedFoundOpponent: null,
      rankedSearching: false,
    });
  },
  setRejoinAvailable: (payload) => {
    logger.info('Realtime store set rejoin available', {
      matchId: payload.matchId,
      mode: payload.mode,
      graceMs: payload.graceMs,
    });
    set({
      rejoinMatch: {
        matchId: payload.matchId,
        mode: payload.mode,
        variant: payload.variant,
        opponent: payload.opponent,
        participants: payload.participants,
        graceMs: payload.graceMs,
        createdAt: Date.now(),
      },
    });
  },
  clearRejoinAvailable: () => {
    logger.info('Realtime store clear rejoin available');
    set({ rejoinMatch: null });
  },
  setWarmupState: (data) => {
    logger.info('Realtime store set warmup state', { bounceCount: data.bounceCount, active: data.active });
    const existing = get().warmup;
    set({
      warmup: {
        bounceCount: data.bounceCount,
        nextTurnUserId: data.nextTurnUserId,
        active: data.active,
        lastTapperId: data.lastTapperId,
        lastTapX: null,
        lastTapY: null,
        playerBest: existing?.playerBest ?? 0,
        pairBest: existing?.pairBest ?? 0,
        gameOver: false,
        finalScore: null,
        isNewPlayerBest: false,
        isNewPairBest: false,
      },
    });
  },
  setWarmupTapped: (data) => {
    logger.info('Realtime store set warmup tapped', { tapperId: data.tapperId, bounceCount: data.bounceCount });
    set((state) => ({
      warmup: {
        ...(state.warmup ?? {
          playerBest: 0,
          pairBest: 0,
          gameOver: false,
          finalScore: null,
          isNewPlayerBest: false,
          isNewPairBest: false,
        }),
        bounceCount: data.bounceCount,
        nextTurnUserId: data.nextTurnUserId,
        lastTapperId: data.tapperId,
        lastTapX: data.tapX,
        lastTapY: data.tapY,
        active: true,
      },
    }));
  },
  setWarmupOver: (data) => {
    logger.info('Realtime store set warmup over', { finalScore: data.finalScore });
    set((state) => {
      const selfId = state.selfUserId;
      const fallbackWarmup = {
        bounceCount: 0,
        nextTurnUserId: '',
        lastTapperId: null,
        lastTapX: null,
        lastTapY: null,
        active: false,
        gameOver: true,
        finalScore: data.finalScore,
        playerBest: data.playerBests[selfId ?? ''] ?? 0,
        pairBest: data.pairBest,
        isNewPlayerBest: data.isNewPlayerBest[selfId ?? ''] ?? false,
        isNewPairBest: data.isNewPairBest,
      };
      if (!state.warmup) {
        return { warmup: fallbackWarmup };
      }
      return {
        warmup: {
          ...state.warmup,
          active: false,
          gameOver: true,
          finalScore: data.finalScore,
          playerBest: data.playerBests[selfId ?? ''] ?? state.warmup.playerBest,
          pairBest: data.pairBest,
          isNewPlayerBest: data.isNewPlayerBest[selfId ?? ''] ?? false,
          isNewPairBest: data.isNewPairBest,
        },
      };
    });
  },
  setWarmupRestarted: (data) => {
    logger.info('Realtime store set warmup restarted', { firstTurnUserId: data.firstTurnUserId });
    set((state) => ({
      warmup: {
        bounceCount: 0,
        nextTurnUserId: data.firstTurnUserId,
        active: true,
        lastTapperId: null,
        lastTapX: null,
        lastTapY: null,
        playerBest: state.warmup?.playerBest ?? 0,
        pairBest: state.warmup?.pairBest ?? 0,
        gameOver: false,
        finalScore: null,
        isNewPlayerBest: false,
        isNewPairBest: false,
      },
    }));
  },
  setWarmupScores: (data) => {
    logger.info('Realtime store set warmup scores', data);
    set((state) => {
      if (!state.warmup) {
        return {
          warmup: {
            bounceCount: 0,
            nextTurnUserId: '',
            active: false,
            lastTapperId: null,
            lastTapX: null,
            lastTapY: null,
            playerBest: data.playerBest,
            pairBest: data.pairBest,
            gameOver: false,
            finalScore: null,
            isNewPlayerBest: false,
            isNewPairBest: false,
          },
        };
      }
      return {
        warmup: {
          ...state.warmup,
          playerBest: data.playerBest,
          pairBest: data.pairBest,
        },
      };
    });
  },
  setOnlineUsers: (data) => {
    logger.info('Realtime store set online users', { onlineUsers: data.onlineUsers });
    set({ onlineUsers: data.onlineUsers });
  },
  clearWarmup: () => {
    logger.info('Realtime store clear warmup');
    set({ warmup: null });
  },
  setSessionState: (payload) => {
    logger.info('Realtime store set session state', payload);
    set({ sessionState: payload });
  },
  revertDraftBan: (actorId) =>
    set((state) => {
      if (!state.draft) return state;
      const remainingBans = { ...state.draft.bans };
      delete remainingBans[actorId];
      return {
        ...state,
        draft: { ...state.draft, bans: remainingBans, turnUserId: actorId },
      };
    }),
  triggerDevPossessionAnimation: ({ result, attackerSeat }) => {
    const id = Date.now();
    logger.info('Realtime store trigger dev possession animation', { id, result, attackerSeat });
    set({ devPossessionAnimation: { id, result, attackerSeat } });
  },
  clearDevPossessionAnimation: () => {
    set({ devPossessionAnimation: null });
  },
  exitCompletedMatchToLobby: () => {
    logger.info('Realtime store exit completed match to lobby');
    set((state) => ({
      ...state,
      draft: null,
      match: null,
      warmup: null,
      matchPaused: false,
      pauseUntil: null,
      rejoinMatch: null,
      devPossessionAnimation: null,
      error: null,
    }));
  },
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
}));
