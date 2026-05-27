import type { StateCreator } from 'zustand';
import { logger } from '@/utils/logger';
import { trackAnswerSubmitted, trackMatchCompleted, trackMatchStarted } from '@/lib/analytics/game-events';
import type {
  MatchAnswerAckPayload,
  MatchCluesGuessAckPayload,
  MatchCountdownGuessAckPayload,
  MatchCountdownPayload,
  MatchFinalResultsPayload,
  MatchOpponentCountdownProgressPayload,
  MatchPartyStatePayload,
  MatchRoundResultPayload,
  MatchStartPayload,
  MatchStatePayload,
  ResolvedMatchQuestionPayload,
} from '@/lib/realtime/socket.types';
import type { DevPossessionAnimation, MatchStatus, RealtimeState } from './types';
import {
  constructFallbackMatchFromResults,
  extractPlayerTotals,
  hasTimingRefresh as hasQuestionTimingRefresh,
  isStaleAnswerAck,
  isStaleStateEvent,
  mergeOpponentFromFinalParticipants,
  parseCountdownDeadline,
  resolvePartyPlayers,
  shouldBufferQuestion,
  shouldClearCountdownOnStateChange,
  shouldClearQuestionOnStateChange,
} from './reducers';

/** Client-side fallback countdown until the server's match:countdown event arrives with the real value. */
const DEFAULT_COUNTDOWN_MS = 5000;
const PARTY_QUIZ_DEFAULT_COUNTDOWN_MS = 5000;

/**
 * Active match state. Owns the `match` field (which holds all gameplay state:
 * current question, answer acks, scores, possession/party state, etc.) plus
 * the dev-only animation trigger.
 *
 * Cross-slice writes (still safe under Zustand 5 typed StateCreator):
 * - setMatchStart wipes lobby + draft + presence state alongside seeding match.
 * - exitCompletedMatchToLobby wipes match + draft + presence + dev anim + error.
 */
export interface MatchSlice {
  match: MatchStatus | null;
  devPossessionAnimation: DevPossessionAnimation | null;
  setMatchStart: (payload: MatchStartPayload) => void;
  setMatchCountdown: (payload: MatchCountdownPayload) => void;
  setMatchState: (payload: MatchStatePayload) => void;
  setPartyState: (payload: MatchPartyStatePayload) => void;
  setMatchQuestion: (payload: ResolvedMatchQuestionPayload) => void;
  promotePendingQuestion: () => void;
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
  triggerDevPossessionAnimation: (payload: { result: 'goal' | 'saved' | 'miss'; attackerSeat: 1 | 2 }) => void;
  clearDevPossessionAnimation: () => void;
  exitCompletedMatchToLobby: () => void;
}

export const matchInitialState = {
  match: null,
  devPossessionAnimation: null,
} as const satisfies Pick<MatchSlice, 'match' | 'devPossessionAnimation'>;

export const createMatchSlice: StateCreator<RealtimeState, [], [], MatchSlice> = (set) => ({
  ...matchInitialState,

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
      pausedAt: null,
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
        categoryName: payload.categoryName,
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
      const startsAtMs = parseCountdownDeadline(payload.startsAt, payload.seconds, Date.now());
      const isResume = payload.reason === 'resume';
      return {
        matchPaused: isResume ? false : state.matchPaused,
        pauseUntil: isResume ? null : state.pauseUntil,
        pausedAt: isResume ? null : state.pausedAt,
        remainingReconnects: isResume ? null : state.remainingReconnects,
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
      const incomingVersion = payload.stateVersion ?? 0;
      if (isStaleStateEvent(incomingVersion, state.match.stateVersion)) {
        logger.warn('Ignoring stale match:state event', {
          incoming: incomingVersion,
          current: state.match.stateVersion,
        });
        return state;
      }

      const shouldClearQuestion = shouldClearQuestionOnStateChange(
        state.match.possessionState?.phase,
        payload,
        Boolean(state.match.lastRoundResult),
      );
      const shouldClearCountdown = shouldClearCountdownOnStateChange(payload);
      return {
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
      // party_state additionally requires currentVersion > 0 — version 0 means
      // we've never received a state event yet and any party_state may arrive.
      if (currentVersion > 0 && isStaleStateEvent(incomingVersion, currentVersion)) {
        logger.warn('Ignoring stale match:party_state event', {
          incoming: incomingVersion,
          current: currentVersion,
        });
        return state;
      }

      const { myPlayer, firstOpponent } = resolvePartyPlayers(payload.players, state.selfUserId);

      return {
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
        const hasTimingRefresh = hasQuestionTimingRefresh(state.match.currentQuestion, payload);
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
      if (shouldBufferQuestion(Boolean(state.match.lastRoundResult), state.match.possessionState?.phase)) {
        logger.info('Buffering match:question as pendingQuestion (result still showing)', {
          qIndex: payload.qIndex,
        });
        return {
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
          const startedAt = q.playableAt ? new Date(q.playableAt).getTime() : 0;
          const timeMs = startedAt ? Math.max(0, Date.now() - startedAt) : 0;
          trackAnswerSubmitted(
            q.question.id,
            payload.isCorrect,
            timeMs,
            payload.qIndex,
            q.question.difficulty,
            q.question.categoryName,
            payload.matchId,
          );
        }
      } catch {
        /* analytics best-effort */
      }
      const currentQIndex = state.match.currentQuestion?.qIndex;
      if (isStaleAnswerAck(payload, currentQIndex)) {
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
              correctIndex: state.match.questions[payload.qIndex]?.correctIndex,
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
      const { myTotals, opponentTotals } = extractPlayerTotals(payload.players, state.selfUserId);
      return {
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
      // Only emit completion analytics for the currently active match so
      // late-arriving payloads (e.g. from a replaced/rejoined session)
      // can't fire telemetry for a stale match.
      const isActiveMatch = state.match?.matchId === payload.matchId;
      if (isActiveMatch) {
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
      }
      if (!state.match) {
        const rejoin = state.rejoinMatch?.matchId === payload.matchId ? state.rejoinMatch : null;
        return {
          matchPaused: false,
          pauseUntil: null,
          pausedAt: null,
          remainingReconnects: null,
          draftPaused: false,
          draftPauseUntil: null,
          draftDisconnectedUserId: null,
          rejoinMatch: null,
          forfeitPending: null,
          match: constructFallbackMatchFromResults(payload, state.selfUserId, rejoin),
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
      const opponent = mergeOpponentFromFinalParticipants(
        payload.participants,
        participants,
        state.selfUserId,
        state.match.opponent,
      );
      return {
        matchPaused: false,
        pauseUntil: null,
        pausedAt: null,
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
    set({
      draft: null,
      match: null,
      matchPaused: false,
      pauseUntil: null,
      pausedAt: null,
      remainingReconnects: null,
      draftPaused: false,
      draftPauseUntil: null,
      draftDisconnectedUserId: null,
      rejoinMatch: null,
      devPossessionAnimation: null,
      error: null,
    });
  },
});
