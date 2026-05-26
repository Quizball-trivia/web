import { create } from 'zustand';
import { logger } from '@/utils/logger';
import {
  trackMatchStarted,
  trackMatchCompleted,
  trackMatchDisconnected,
  trackMatchReconnected,
  trackMatchForfeit,
  trackAnswerSubmitted,
} from '@/lib/analytics/game-events';
import type {
  DraftCategory,
  DraftState,
  LobbyState,
  MatchAnswerAckPayload,
  MatchCluesGuessAckPayload,
  MatchCountdownGuessAckPayload,
  MatchOpponentCountdownProgressPayload,
  MatchFinalResultsPayload,
  MatchForfeitPendingPayload,
  MatchPartyStatePayload,
  DraftOpponentDisconnectedPayload,
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
  LobbyChallengeInvitePayload,
  PresenceOnlineCountPayload,
  SessionStatePayload,
} from '@/lib/realtime/socket.types';

/** Client-side fallback countdown until the server's match:countdown event arrives with the real value. */
const DEFAULT_COUNTDOWN_MS = 5000;
const PARTY_QUIZ_DEFAULT_COUNTDOWN_MS = 5000;

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
  /** Whether the self user answered this question correctly (set by round_result). */
  selfIsCorrect?: boolean;
  /** Whether the opponent answered this question correctly (set by round_result). */
  opponentIsCorrect?: boolean;
}

export interface MatchStatus {
  matchId: string;
  mode: 'friendly' | 'ranked';
  variant: MatchVariant;
  mySeat: number | null;
  opponent: OpponentInfo;
  /** Recipient's last 3 match results (most recent first) — surfaced to the showdown screen's form strip. */
  myRecentForm?: Array<'W' | 'L' | 'D'>;
  participants: MatchParticipant[];
  countdownEndsAt: number | null;
  countdownReason: 'kickoff' | 'resume' | null;
  currentQuestion: ResolvedMatchQuestionPayload | null;
  pendingQuestion: ResolvedMatchQuestionPayload | null;
  questions: Record<number, MatchQuestionState>;
  answerAck: MatchAnswerAckPayload | null;
  countdownGuessAck: MatchCountdownGuessAckPayload | null;
  /** Live opponent countdown found-count, updated by the server when the
   *  opponent lands an answer. Replaces the legacy simulated counter. */
  opponentCountdownFoundCount: number;
  cluesGuessAck: MatchCluesGuessAckPayload | null;
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
}

export interface RejoinMatchStatus {
  matchId: string;
  mode: 'friendly' | 'ranked';
  variant: MatchVariant;
  opponent: OpponentInfo;
  participants: MatchParticipant[];
  graceMs: number;
  remainingReconnects: number;
  createdAt: number;
}

export interface ForfeitPendingStatus extends MatchForfeitPendingPayload {
  createdAt: number;
}

export interface DevPossessionAnimation {
  id: number;
  result: 'goal' | 'saved' | 'miss';
  attackerSeat: 1 | 2;
}

export type LobbyChallengeInvite = LobbyChallengeInvitePayload;
type LobbyBannerSuppressionReason = 'challenge';

interface RealtimeState {
  lobby: LobbyState | null;
  challengeInvites: LobbyChallengeInvite[];
  pendingLobbyHandoffCode: string | null;
  suppressLobbyBannerUntil: number | null;
  suppressLobbyBannerReason: LobbyBannerSuppressionReason | null;
  draft: DraftStatus | null;
  match: MatchStatus | null;
  onlineUsers: number | null;
  sessionState: SessionStatePayload | null;
  selfUserId: string | null;
  matchPaused: boolean;
  pauseUntil: number | null;
  remainingReconnects: number | null;
  draftPaused: boolean;
  draftPauseUntil: number | null;
  draftDisconnectedUserId: string | null;
  rejoinMatch: RejoinMatchStatus | null;
  forfeitPending: ForfeitPendingStatus | null;
  devPossessionAnimation: DevPossessionAnimation | null;
  error: ErrorPayload | null;
  setSelfUserId: (userId: string | null) => void;
  setLobby: (lobby: LobbyState) => void;
  addChallengeInvite: (invite: LobbyChallengeInvite) => void;
  removeChallengeInvite: (invitationId: string) => void;
  beginLobbyHandoff: (inviteCode: string) => void;
  clearLobbyHandoff: () => void;
  suppressLobbyBanner: (durationMs?: number, reason?: LobbyBannerSuppressionReason) => void;
  clearLobbyBannerSuppression: () => void;
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
  setCountdownGuessAck: (payload: MatchCountdownGuessAckPayload) => void;
  setOpponentCountdownProgress: (payload: MatchOpponentCountdownProgressPayload) => void;
  setCluesGuessAck: (payload: MatchCluesGuessAckPayload) => void;
  setOpponentAnswered: (payload?: {
    matchId?: string;
    qIndex?: number;
    opponentTotalPoints?: number;
    pointsEarned?: number;
    isCorrect?: boolean;
    selectedIndex?: number | null;
  }) => void;
  setQuestionPhase: (phase: 'reveal' | 'playing') => void;
  setRoundResult: (payload: MatchRoundResultPayload) => void;
  setFinalResults: (payload: MatchFinalResultsPayload) => void;
  setForfeitPending: (payload: MatchForfeitPendingPayload) => void;
  clearForfeitPending: () => void;
  setMatchPaused: (payload: { graceMs: number; remainingReconnects: number }) => void;
  clearMatchPaused: () => void;
  setDraftPaused: (payload: DraftOpponentDisconnectedPayload) => void;
  clearDraftPaused: () => void;
  setRejoinAvailable: (payload: MatchRejoinAvailablePayload) => void;
  clearRejoinAvailable: () => void;
  setOnlineUsers: (data: PresenceOnlineCountPayload) => void;
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
  challengeInvites: [],
  pendingLobbyHandoffCode: null,
  suppressLobbyBannerUntil: null,
  suppressLobbyBannerReason: null,
  draft: null,
  match: null,
  onlineUsers: null,
  sessionState: null,
  selfUserId: null,
  matchPaused: false,
  pauseUntil: null,
  remainingReconnects: null,
  draftPaused: false,
  draftPauseUntil: null,
  draftDisconnectedUserId: null,
  rejoinMatch: null,
  forfeitPending: null,
  devPossessionAnimation: null,
  error: null,
};

export const useRealtimeMatchStore = create<RealtimeState>((set) => ({
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
  addChallengeInvite: (invite) => {
    logger.info('Realtime store add challenge invite', {
      invitationId: invite.invitationId,
      lobbyId: invite.lobbyId,
      fromUserId: invite.fromUser.id,
    });
    set((state) => {
      const withoutDuplicate = state.challengeInvites.filter(
        (item) => item.invitationId !== invite.invitationId,
      );
      return { challengeInvites: [invite, ...withoutDuplicate] };
    });
  },
  removeChallengeInvite: (invitationId) => {
    logger.info('Realtime store remove challenge invite', { invitationId });
    set((state) => ({
      challengeInvites: state.challengeInvites.filter((invite) => invite.invitationId !== invitationId),
    }));
  },
  beginLobbyHandoff: (inviteCode) => {
    if (typeof inviteCode !== 'string' || inviteCode.length === 0) return;
    set({
      pendingLobbyHandoffCode: inviteCode.toUpperCase(),
      suppressLobbyBannerUntil: Date.now() + 8000,
      suppressLobbyBannerReason: 'challenge',
    });
  },
  clearLobbyHandoff: () => {
    set({ pendingLobbyHandoffCode: null });
  },
  suppressLobbyBanner: (durationMs = 5000, reason = 'challenge') => {
    set({
      suppressLobbyBannerUntil: Date.now() + durationMs,
      suppressLobbyBannerReason: reason,
    });
  },
  clearLobbyBannerSuppression: () => {
    set({
      suppressLobbyBannerUntil: null,
      suppressLobbyBannerReason: null,
    });
  },
  setDraftStart: (draft) => {
    logger.info('Realtime store set draft start', {
      lobbyId: draft.lobbyId,
      categoryCount: draft.categories.length,
    });
    set({
      draftPaused: false,
      draftPauseUntil: null,
      draftDisconnectedUserId: null,
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
      try {
        const isAiOpponent = !/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(payload.opponent.id ?? '');
        trackMatchStarted({
          matchId: payload.matchId,
          mode: payload.mode,
          variant: payload.variant,
          opponentIsAi: isAiOpponent,
          opponentRp: payload.opponent.rp,
        });
      } catch {
        /* analytics best-effort */
      }
      set({
        lobby: null,
        draft: null,
        matchPaused: false,
        pauseUntil: null,
        remainingReconnects: null,
        draftPaused: false,
        draftPauseUntil: null,
        draftDisconnectedUserId: null,
        rejoinMatch: null,
        forfeitPending: null,
      match: {
        matchId: payload.matchId,
        mode: payload.mode,
        variant: payload.variant,
        mySeat: payload.mySeat ?? null,
        opponent: payload.opponent,
        myRecentForm: payload.myRecentForm,
        participants: payload.participants,
        countdownEndsAt: Date.now() + (payload.variant === 'friendly_party_quiz'
          ? PARTY_QUIZ_DEFAULT_COUNTDOWN_MS
          : DEFAULT_COUNTDOWN_MS),
        countdownReason: 'kickoff',
        currentQuestion: null,
        pendingQuestion: null,
        questions: {},
        answerAck: null,
        countdownGuessAck: null,
        opponentCountdownFoundCount: 0,
        cluesGuessAck: null,
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
      },
    });
  },
  setMatchCountdown: (payload) => {
    logger.info('Realtime store set match countdown', {
      matchId: payload.matchId,
      seconds: payload.seconds,
      startsAt: payload.startsAt,
      reason: payload.reason,
    });
    set((state) => {
      if (!state.match || state.match.matchId !== payload.matchId) return state;
      const startsAtMs = Number.isFinite(new Date(payload.startsAt).getTime())
        ? new Date(payload.startsAt).getTime()
        : Date.now() + Math.max(0, payload.seconds) * 1000;
      return {
        ...state,
        matchPaused: payload.reason === 'resume' ? false : state.matchPaused,
        pauseUntil: payload.reason === 'resume' ? null : state.pauseUntil,
        remainingReconnects: payload.reason === 'resume' ? null : state.remainingReconnects,
        match: {
          ...state.match,
          countdownEndsAt: startsAtMs,
          countdownReason: payload.reason ?? 'kickoff',
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
      
      const isSecondHalfKickoff =
        state.match.possessionState?.phase === 'HALFTIME'
        && payload.phase === 'NORMAL_PLAY'
        && payload.half === 2;
      const shouldClearQuestion =
        isSecondHalfKickoff ||
        (
          (payload.phase === 'COMPLETED' || payload.phase === 'HALFTIME')
          && !state.match.lastRoundResult
        );
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
          countdownReason: shouldClearCountdown ? null : state.match.countdownReason,
          currentQuestion: shouldClearQuestion ? null : state.match.currentQuestion,
          pendingQuestion: shouldClearQuestion ? null : state.match.pendingQuestion,
          answerAck: shouldClearQuestion ? null : state.match.answerAck,
          countdownGuessAck: shouldClearQuestion ? null : state.match.countdownGuessAck,
          cluesGuessAck: shouldClearQuestion ? null : state.match.cluesGuessAck,
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
      questionKind: payload.question.kind,
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
      if (payload.qIndex < currentQIndex) {
        logger.warn('Ignoring stale match:question event', {
          received: payload.qIndex,
          current: currentQIndex,
        });
        return state;
      }

      if (payload.qIndex === currentQIndex) {
        const currentDeadlineMs = state.match.currentQuestion?.deadlineAt
          ? new Date(state.match.currentQuestion.deadlineAt).getTime()
          : Number.NaN;
        const incomingDeadlineMs = payload.deadlineAt ? new Date(payload.deadlineAt).getTime() : Number.NaN;
        const hasTimingRefresh = Boolean(
          state.match.currentQuestion &&
          (
            state.match.currentQuestion.deadlineAt !== payload.deadlineAt ||
            state.match.currentQuestion.playableAt !== payload.playableAt
          ) &&
          (
            !Number.isFinite(currentDeadlineMs) ||
            !Number.isFinite(incomingDeadlineMs) ||
            incomingDeadlineMs >= currentDeadlineMs
          )
        );
        if ((!state.matchPaused && !hasTimingRefresh) || !state.match.currentQuestion) {
          logger.warn('Ignoring duplicate match:question event for active question', {
            qIndex: payload.qIndex,
            matchPaused: state.matchPaused,
            hasTimingRefresh,
          });
          return state;
        }

        logger.info('Refreshing current question timing after pause/rejoin', {
          qIndex: payload.qIndex,
          questionKind: payload.question.kind,
        });

        return {
          ...state,
          match: {
            ...state.match,
            currentQuestion: payload,
            pendingQuestion: null,
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
            countdownReason: payload.qIndex > 0 ? null : state.match.countdownReason,
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
        options: payload.question.kind === 'multipleChoice' ? payload.question.options : [],
        categoryName: payload.question.categoryName,
      });

      return {
        ...state,
        match: {
          ...state.match,
          currentQuestion: payload,
          pendingQuestion: null,
          countdownEndsAt: payload.qIndex > 0 ? null : state.match.countdownEndsAt,
          countdownReason: payload.qIndex > 0 ? null : state.match.countdownReason,
          answerAck: null,
          countdownGuessAck: null,
        opponentCountdownFoundCount: 0,
          cluesGuessAck: null,
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
          countdownReason: pending.qIndex > 0 ? null : state.match.countdownReason,
          answerAck: null,
          countdownGuessAck: null,
        opponentCountdownFoundCount: 0,
          cluesGuessAck: null,
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
      if (state.match.matchId !== payload.matchId) {
        logger.warn('Ignoring mismatched match:answer_ack event', {
          activeMatchId: state.match.matchId,
          payloadMatchId: payload.matchId,
        });
        return state;
      }
      try {
        const q = state.match.currentQuestion;
        if (q && q.qIndex === payload.qIndex) {
          const startedAt = (q as { startedAt?: number; startsAt?: number }).startedAt
            ?? (q as { startsAt?: number }).startsAt
            ?? 0;
          const timeMs = startedAt ? Math.max(0, Date.now() - startedAt) : 0;
          trackAnswerSubmitted(
            (q as { questionId?: string; id?: string }).questionId
              ?? (q as { id?: string }).id
              ?? `${payload.matchId}:${payload.qIndex}`,
            payload.isCorrect,
            timeMs,
            payload.qIndex,
            (q as { difficulty?: string }).difficulty,
            (q as { categoryName?: string; category?: string }).categoryName
              ?? (q as { category?: string }).category,
            payload.matchId,
          );
        }
      } catch {
        /* analytics best-effort */
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
          countdownGuessAck: null,
        opponentCountdownFoundCount: 0,
          cluesGuessAck: null,
          myTotalPoints: payload.myTotalPoints,
          opponentAnswered: payload.oppAnswered,
          questions: {
            ...state.match.questions,
            [payload.qIndex]: {
              payload: fallbackQuestion,
              correctIndex: payload.correctIndex ?? state.match.questions[payload.qIndex]?.correctIndex,
            },
          },
        },
      };
    });
  },
  setCountdownGuessAck: (payload) => {
    logger.info('Realtime store set countdown guess ack', {
      matchId: payload.matchId,
      qIndex: payload.qIndex,
      accepted: payload.accepted,
      foundCount: payload.foundCount,
    });
    set((state) => {
      if (!state.match) return state;
      if (state.match.matchId !== payload.matchId) {
        logger.warn('Ignoring mismatched match:countdown_guess_ack event', {
          activeMatchId: state.match.matchId,
          payloadMatchId: payload.matchId,
        });
        return state;
      }
      const currentQIndex = state.match.currentQuestion?.qIndex;
      if (currentQIndex !== undefined && payload.qIndex !== currentQIndex) {
        logger.warn('Ignoring stale match:countdown_guess_ack event', {
          received: payload.qIndex,
          current: currentQIndex,
        });
        return state;
      }
      return {
        ...state,
        match: {
          ...state.match,
          countdownGuessAck: payload,
        },
      };
    });
  },
  setOpponentCountdownProgress: (payload) => {
    logger.info('Realtime store set opponent countdown progress', {
      matchId: payload.matchId,
      qIndex: payload.qIndex,
      foundCount: payload.foundCount,
    });
    set((state) => {
      if (!state.match) return state;
      if (state.match.matchId !== payload.matchId) return state;
      const currentQIndex = state.match.currentQuestion?.qIndex;
      if (currentQIndex !== undefined && payload.qIndex !== currentQIndex) return state;
      // Monotonic: only advance, never go backwards.
      if (payload.foundCount <= state.match.opponentCountdownFoundCount) return state;
      return {
        ...state,
        match: {
          ...state.match,
          opponentCountdownFoundCount: payload.foundCount,
        },
      };
    });
  },
  setCluesGuessAck: (payload) => {
    logger.info('Realtime store set clues guess ack', {
      matchId: payload.matchId,
      qIndex: payload.qIndex,
      clueIndex: payload.clueIndex,
      revealCount: payload.revealCount,
    });
    set((state) => {
      if (!state.match) return state;
      if (state.match.matchId !== payload.matchId) {
        logger.warn('Ignoring mismatched match:clues_guess_ack event', {
          activeMatchId: state.match.matchId,
          payloadMatchId: payload.matchId,
        });
        return state;
      }
      const currentQIndex = state.match.currentQuestion?.qIndex;
      if (currentQIndex !== undefined && payload.qIndex !== currentQIndex) {
        logger.warn('Ignoring stale match:clues_guess_ack event', {
          received: payload.qIndex,
          current: currentQIndex,
        });
        return state;
      }
      return {
        ...state,
        match: {
          ...state.match,
          cluesGuessAck: payload,
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
          countdownGuessAck: null,
        opponentCountdownFoundCount: 0,
          cluesGuessAck: null,
          myTotalPoints: myTotals?.totalPoints ?? state.match.myTotalPoints,
          oppTotalPoints: opponentTotals?.totalPoints ?? state.match.oppTotalPoints,
            questions: {
            ...state.match.questions,
            [payload.qIndex]: {
              payload: fallbackQuestion,
              correctIndex:
                payload.reveal.kind === 'multipleChoice'
                  ? payload.reveal.correctIndex
                  : state.match.questions[payload.qIndex]?.correctIndex,
              selfIsCorrect: myTotals?.isCorrect ?? state.match.questions[payload.qIndex]?.selfIsCorrect,
              opponentIsCorrect:
                opponentTotals?.isCorrect ?? state.match.questions[payload.qIndex]?.opponentIsCorrect,
            },
          },
        },
      };
    });
  },
  setFinalResults: (payload) => {
    logger.info('Realtime store set final results', {
      matchId: payload.matchId,
      winnerId: payload.winnerId,
      variant: payload.variant,
    });
    set((state) => {
      try {
        const selfId = state.selfUserId;
        const myPlayer = selfId ? payload.players[selfId] : null;
        const oppParticipant = (payload.participants ?? state.match?.participants ?? [])
          .find((p) => p.userId !== selfId);
        const oppPlayer = oppParticipant ? payload.players[oppParticipant.userId] : null;
        const myScore = myPlayer?.totalPoints ?? 0;
        const oppScore = oppPlayer?.totalPoints ?? 0;
        const isAiOpponent = oppParticipant
          ? !/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(oppParticipant.userId)
          : false;
        const won = selfId ? payload.winnerId === selfId : false;
        trackMatchCompleted({
          matchId: payload.matchId,
          mode: state.match?.mode ?? (payload.rankedOutcome ? 'ranked' : 'friendly'),
          variant: payload.variant ?? state.match?.variant,
          won,
          score: myScore,
          opponentScore: oppScore,
          rpChange: selfId ? payload.rankedOutcome?.byUserId?.[selfId]?.deltaRp : undefined,
          opponentIsAi: isAiOpponent,
        });
      } catch {
        /* analytics best-effort */
      }
      if (!state.match) {
        const rejoin = state.rejoinMatch?.matchId === payload.matchId ? state.rejoinMatch : null;
        const replayVariant =
          rejoin?.variant
          ?? payload.variant
          ?? (payload.standings ? 'friendly_party_quiz' : payload.rankedOutcome ? 'ranked_sim' : 'friendly_possession');
        const userIds = Object.keys(payload.players);
        const fallbackParticipants: MatchParticipant[] = userIds.map((userId, index) => ({
          userId,
          username: userId === state.selfUserId ? 'You' : `Player ${index + 1}`,
          avatarUrl: null,
          avatarCustomization: null,
          seat: index + 1,
        }));
        const participants = rejoin?.participants ?? payload.participants ?? fallbackParticipants;
        const opponentParticipant =
          participants.find((participant) => participant.userId !== state.selfUserId) ?? participants[0];
        const opponent = rejoin?.opponent ?? {
          id: opponentParticipant?.userId ?? 'opponent',
          username: opponentParticipant?.username ?? 'Opponent',
          avatarUrl: opponentParticipant?.avatarUrl ?? null,
          avatarCustomization: opponentParticipant?.avatarCustomization ?? null,
          ...(opponentParticipant?.rankPoints != null ? { rp: opponentParticipant.rankPoints } : {}),
        };

        return {
          ...state,
          matchPaused: false,
          pauseUntil: null,
          remainingReconnects: null,
          draftPaused: false,
          draftPauseUntil: null,
          draftDisconnectedUserId: null,
          rejoinMatch: null,
          forfeitPending: null,
          match: {
            matchId: payload.matchId,
            mode: rejoin?.mode ?? (payload.rankedOutcome ? 'ranked' : 'friendly'),
            variant: replayVariant,
            mySeat: participants.find((participant) => participant.userId === state.selfUserId)?.seat ?? null,
            opponent,
            participants,
            countdownEndsAt: null,
            countdownReason: null,
            currentQuestion: null,
            pendingQuestion: null,
            questions: {},
            answerAck: null,
            countdownGuessAck: null,
        opponentCountdownFoundCount: 0,
            cluesGuessAck: null,
            opponentAnswered: false,
            opponentSelectedIndex: null,
            myTotalPoints: state.selfUserId ? payload.players[state.selfUserId]?.totalPoints ?? 0 : 0,
            oppTotalPoints: opponentParticipant ? payload.players[opponentParticipant.userId]?.totalPoints ?? 0 : 0,
            opponentRecentPoints: 0,
            lastRoundResult: null,
            finalResults: payload,
            currentQuestionPhase: 'reveal',
            opponentAnsweredCorrectly: null,
            possessionState: null,
            partyState: null,
            stateVersion: 0,
          },
        };
      }
      if (state.match.matchId !== payload.matchId) {
        logger.warn('Ignoring mismatched match:final_results event', {
          activeMatchId: state.match.matchId,
          payloadMatchId: payload.matchId,
        });
        return state;
      }
      const participants = payload.participants ?? state.match.participants;
      const opponentParticipant =
        participants.find((participant) => participant.userId !== state.selfUserId) ?? participants[0];
      const opponent = payload.participants && opponentParticipant
        ? {
            ...state.match.opponent,
            id: opponentParticipant.userId,
            username: opponentParticipant.username,
            avatarUrl: opponentParticipant.avatarUrl,
            avatarCustomization: opponentParticipant.avatarCustomization,
            ...(opponentParticipant.rankPoints != null ? { rp: opponentParticipant.rankPoints } : {}),
          }
        : state.match.opponent;
      return {
        ...state,
        matchPaused: false,
        pauseUntil: null,
        remainingReconnects: null,
        draftPaused: false,
        draftPauseUntil: null,
        draftDisconnectedUserId: null,
        rejoinMatch: null,
        forfeitPending: null,
        match: {
          ...state.match,
          variant: payload.variant ?? (payload.standings ? 'friendly_party_quiz' : state.match.variant),
          opponent,
          participants,
          countdownEndsAt: null,
          countdownReason: null,
          finalResults: payload,
        },
      };
    });
  },
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
      matchPaused: false,
      pauseUntil: null,
      remainingReconnects: null,
      rejoinMatch: null,
    });
  },
  clearForfeitPending: () => {
    logger.info('Realtime store clear forfeit pending');
    set({ forfeitPending: null });
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
        remainingReconnects,
      };
    });
  },
  clearMatchPaused: () => {
    logger.info('Realtime store clear match paused');
    set((state) => {
      try {
        if (state.match && state.matchPaused && state.pauseUntil) {
          // remaining grace was (pauseUntil - now), so downtime = graceTotal - remaining.
          // We don't have graceTotal here, fallback to time-since-pause = 0 wouldn't help;
          // instead estimate downtime as elapsed grace consumed.
          const remainingMs = Math.max(0, state.pauseUntil - Date.now());
          const downtimeSec = Math.max(0, Math.round((Date.now() - (state.pauseUntil - remainingMs)) / 1000));
          trackMatchReconnected(state.match.matchId, downtimeSec);
        }
      } catch {
        /* analytics best-effort */
      }
      return {
        matchPaused: false,
        pauseUntil: null,
        remainingReconnects: null,
      };
    });
  },
  setDraftPaused: ({ lobbyId, opponentId, graceMs }) => {
    logger.info('Realtime store set draft paused', { lobbyId, opponentId, graceMs });
    set((state) => {
      if (state.draft?.lobbyId !== lobbyId && state.lobby?.lobbyId !== lobbyId) return state;
      return {
        ...state,
        draftPaused: true,
        draftPauseUntil: Date.now() + graceMs,
        draftDisconnectedUserId: opponentId,
      };
    });
  },
  clearDraftPaused: () => {
    logger.info('Realtime store clear draft paused');
    set({
      draftPaused: false,
      draftPauseUntil: null,
      draftDisconnectedUserId: null,
    });
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
    });
  },
  clearRejoinAvailable: () => {
    logger.info('Realtime store clear rejoin available');
    set({ rejoinMatch: null });
  },
  setOnlineUsers: (data) => {
    logger.info('Realtime store set online users', { onlineUsers: data.onlineUsers });
    set({ onlineUsers: data.onlineUsers });
  },
  setSessionState: (payload) => {
    logger.info('Realtime store set session state', payload);
    set((state) => {
      const lobbyId = state.lobby?.lobbyId ?? null;
      const sessionLobbyIds = new Set(
        [payload.waitingLobbyId, ...payload.openLobbyIds].filter(
          (id): id is string => typeof id === 'string' && id.length > 0,
        ),
      );
      const shouldClearLobby = lobbyId !== null && !sessionLobbyIds.has(lobbyId);
      return {
        sessionState: payload,
        ...(shouldClearLobby
          ? {
              lobby: null,
              draft: null,
              draftPaused: false,
              draftPauseUntil: null,
              draftDisconnectedUserId: null,
            }
          : {}),
      };
    });
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
      matchPaused: false,
      pauseUntil: null,
      remainingReconnects: null,
      draftPaused: false,
      draftPauseUntil: null,
      draftDisconnectedUserId: null,
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
