import { create } from 'zustand';
import { logger } from '@/utils/logger';
import type {
  DraftCategory,
  DraftState,
  LobbyState,
  MatchAnswerAckPayload,
  MatchFinalResultsPayload,
  MatchRejoinAvailablePayload,
  MatchStatePayload,
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
  allowedCategoryIds: [string, string] | null;
}

export interface MatchQuestionState {
  payload: ResolvedMatchQuestionPayload;
  correctIndex?: number;
}

export interface MatchStatus {
  matchId: string;
  mySeat: 1 | 2 | null;
  opponent: OpponentInfo;
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
  stateVersion: number;
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
  opponent: OpponentInfo;
  graceMs: number;
  createdAt: number;
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
  error: ErrorPayload | null;
  setSelfUserId: (userId: string | null) => void;
  setLobby: (lobby: LobbyState) => void;
  setDraftStart: (draft: DraftState) => void;
  setDraftBan: (actorId: string, categoryId: string) => void;
  setDraftComplete: (allowed: [string, string]) => void;
  setMatchStart: (payload: MatchStartPayload) => void;
  setMatchCountdown: (payload: MatchCountdownPayload) => void;
  setMatchQuestion: (payload: ResolvedMatchQuestionPayload) => void;
  promotePendingQuestion: () => void;
  setMatchState: (payload: MatchStatePayload) => void;
  setAnswerAck: (payload: MatchAnswerAckPayload) => void;
  setOpponentAnswered: (payload?: {
    qIndex?: number;
    opponentTotalPoints?: number;
    pointsEarned?: number;
    isCorrect?: boolean;
    selectedIndex?: number | null;
  }) => void;
  setQuestionPhase: (phase: 'reveal' | 'playing') => void;
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
        allowedCategoryIds: null,
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
  setDraftComplete: (allowed) => {
    logger.info('Realtime store set draft complete', { allowedCategoryIds: allowed });
    set((state) => ({
      ...state,
      draft: state.draft
        ? {
            ...state.draft,
            allowedCategoryIds: allowed,
          }
        : null,
    }));
  },
  setMatchStart: (payload) => {
    logger.info('Realtime store set match start', { matchId: payload.matchId, opponentId: payload.opponent.id });
    set({
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
        mySeat: payload.mySeat ?? null,
        opponent: payload.opponent,
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
        stateVersion: 0,
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
      sharedPossession: payload.sharedPossession,
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
      const shouldClearQuestion = payload.phase === 'HALFTIME' || payload.phase === 'COMPLETED';
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
  setRoundResult: (payload) => {
    logger.info('Realtime store set round result', { matchId: payload.matchId, qIndex: payload.qIndex });
    set((state) => {
      if (!state.match) return state;
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
    set((state) => ({
      ...state,
      matchPaused: false,
      pauseUntil: null,
      rejoinMatch: null,
      match: state.match
        ? {
            ...state.match,
            finalResults: payload,
          }
        : null,
    }));
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
    set({
      rankedSearchDurationMs: durationMs,
      rankedSearchStartedAt: Date.now(),
      rankedFoundOpponent: null,
      rankedSearching: true,
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
        opponent: payload.opponent,
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
      const { [actorId]: _removed, ...remainingBans } = state.draft.bans;
      return {
        ...state,
        draft: { ...state.draft, bans: remainingBans, turnUserId: actorId },
      };
    }),
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
