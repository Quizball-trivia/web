import { getSocket } from './socket-client';
import { useRealtimeMatchStore } from '@/stores/realtimeMatch.store';
import { useRankedMatchmakingStore } from '@/stores/rankedMatchmaking.store';
import { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queries/queryKeys';
import { logger } from '@/utils/logger';
import { storage, STORAGE_KEYS } from '@/utils/storage';
import { getI18nText } from '@/lib/utils/i18n';
import { toast } from 'sonner';
import { getMe } from '@/lib/api/endpoints';
import { useAuthStore } from '@/stores/auth.store';
import type {
  DraftState,
  ErrorPayload,
  MatchChanceCardAppliedPayload,
  MatchCluesGuessAckPayload,
  MatchCountdownGuessAckPayload,
  LobbyState,
  MatchAnswerAckPayload,
  MatchFinalResultsPayload,
  MatchPartyStatePayload,
  MatchStatePayload,
  MatchOpponentAnsweredPayload,
  MatchOpponentDisconnectedPayload,
  RankedMatchFoundPayload,
  RankedSearchStartedPayload,
  MatchQuestionPayload,
  MatchRoundResultPayload,
  MatchCountdownPayload,
  MatchRejoinAvailablePayload,
  MatchResumePayload,
  MatchStartPayload,
  PresenceOnlineCountPayload,
  SessionStatePayload,
  SessionBlockedPayload,
} from './socket.types';

// Module-level ref so handlers always read the latest queryClient
// without needing to tear down and re-register all listeners.
let _queryClient: QueryClient | null = null;
let _handlersRegistered = false;

function getQueryClient(): QueryClient | null {
  return _queryClient;
}

export function registerSocketHandlers(queryClient?: QueryClient): void {
  // Update the module-level ref so existing handlers pick up the new client
  if (queryClient) {
    _queryClient = queryClient;
  }

  // If handlers are already registered on this socket, skip re-registration
  if (_handlersRegistered) return;
  _handlersRegistered = true;

  const socket = getSocket();
  const store = useRealtimeMatchStore.getState();

  socket.on('session:state', (data: SessionStatePayload) => {
    logger.info('Socket event session:state', data);
    store.setSessionState(data);
  });

  socket.on('session:blocked', (data: SessionBlockedPayload) => {
    logger.warn('Socket event session:blocked', data);
    store.setSessionState(data.stateSnapshot);
    store.setError({
      code: data.reason,
      message: data.message,
      meta: {
        source: 'session:blocked',
        reason: data.reason,
        operation: data.operation ?? null,
        stateSnapshot: data.stateSnapshot,
      },
    });
  });

  socket.on('lobby:state', (data: LobbyState) => {
    logger.info('Socket event lobby:state', {
      lobbyId: data.lobbyId,
      status: data.status,
      memberCount: data.members.length,
      memberIds: data.members.map((member) => member.userId),
    });
    store.setLobby(data);
  });

  socket.on('error', (data: ErrorPayload) => {
    logger.warn('Socket event error', { code: data.code, message: data.message, meta: data.meta });
    if (
      data.code === 'RANKED_QUEUE_BLOCKED' ||
      data.code === 'RANKED_QUEUE_UNAVAILABLE' ||
      data.code === 'RANKED_QUEUE_BUSY' ||
      data.code === 'INSUFFICIENT_TICKETS'
    ) {
      useRankedMatchmakingStore.getState().setRankedQueueLeft();
    }
    // Rollback optimistic draft ban on server rejection
    if (
      data.code === 'NOT_YOUR_TURN' ||
      data.code === 'INVALID_CATEGORY' ||
      data.code === 'BAN_FAILED'
    ) {
      const { selfUserId, revertDraftBan } = useRealtimeMatchStore.getState();
      if (selfUserId) {
        revertDraftBan(selfUserId);
      }
    }

    if (
      data.code === 'CHANCE_CARD_NOT_AVAILABLE'
      || data.code === 'CHANCE_CARD_NOT_ALLOWED'
      || data.code === 'CHANCE_CARD_ALREADY_USED'
      || data.code === 'CHANCE_CARD_SYNC_FAILED'
    ) {
      const meta = data.meta as
        | {
          qIndex?: number;
          clientActionId?: string;
        }
        | undefined;
      store.rollbackOptimisticChanceCard({
        qIndex: typeof meta?.qIndex === 'number' ? meta.qIndex : undefined,
        clientActionId: typeof meta?.clientActionId === 'string' ? meta.clientActionId : undefined,
      });
      toast.error(data.message);
      const qc = getQueryClient();
      if (qc) {
        void qc.invalidateQueries({ queryKey: queryKeys.store.inventory() });
      }
    }
    if (data.code === 'INSUFFICIENT_TICKETS') {
      toast.error(data.message);
      const qc = getQueryClient();
      if (qc) {
        void qc.invalidateQueries({ queryKey: queryKeys.store.wallet() });
      }
    }
    store.setError(data);
  });

  socket.on('draft:start', (data: DraftState) => {
    logger.info('Socket event draft:start', {
      lobbyId: data.lobbyId,
      categoryCount: data.categories.length,
      turnUserId: data.turnUserId,
    });
    store.setDraftStart(data);
  });

  socket.on('draft:banned', (data: { actorId: string; categoryId: string }) => {
    logger.info('Socket event draft:banned', data);
    store.setDraftBan(data.actorId, data.categoryId);
  });

  socket.on('draft:complete', (data: { halfOneCategoryId: string }) => {
    logger.info('Socket event draft:complete', {
      halfOneCategoryId: data.halfOneCategoryId,
    });
    store.setDraftComplete(data.halfOneCategoryId);
  });

  socket.on('match:start', (data: MatchStartPayload) => {
    logger.info('Socket event match:start', { matchId: data.matchId, opponentId: data.opponent.id });
    store.setMatchStart(data);
    const qc = getQueryClient();
    if (qc) {
      void qc.invalidateQueries({ queryKey: queryKeys.store.wallet() });
    }
  });

  socket.on('match:countdown', (data: MatchCountdownPayload) => {
    logger.info('Socket event match:countdown', {
      matchId: data.matchId,
      seconds: data.seconds,
      startsAt: data.startsAt,
    });
    store.setMatchCountdown(data);
  });

  socket.on('match:state', (data: MatchStatePayload) => {
    logger.info('Socket event match:state', {
      matchId: data.matchId,
      phase: data.phase,
      half: data.half,
      possessionDiff: data.possessionDiff,
      phaseKind: data.phaseKind,
      phaseRound: data.phaseRound,
    });
    store.setMatchState(data);
  });

  socket.on('match:party_state', (data: MatchPartyStatePayload) => {
    logger.info('Socket event match:party_state', {
      matchId: data.matchId,
      currentQuestionIndex: data.currentQuestionIndex,
      leaderUserId: data.leaderUserId,
      playerCount: data.players.length,
      stateVersion: data.stateVersion,
    });
    store.setPartyState(data);
  });

  socket.on('match:question', (data: MatchQuestionPayload) => {
    logger.info('Socket event match:question', {
      matchId: data.matchId,
      qIndex: data.qIndex,
      total: data.total,
      deadlineAt: data.deadlineAt,
      questionKind: data.question.kind,
    });

    // Resolve i18n fields to the user's preferred locale.
    // Use the question prompt's available locale to keep category name consistent —
    // if the question isn't translated, show the category name in English too.
    const preferredLocale = storage.get(STORAGE_KEYS.LOCALE, 'en');
    const questionHasLocale = data.question.prompt && data.question.prompt[preferredLocale];
    const locale = questionHasLocale ? preferredLocale : 'en';
    const categoryName = data.question.categoryName
      ? getI18nText(data.question.categoryName, locale)
      : undefined;
    const resolvedData = {
      ...data,
      question:
        data.question.kind === 'multipleChoice'
          ? {
              ...data.question,
              resolvedLocale: locale,
              prompt: getI18nText(data.question.prompt, locale),
              options: data.question.options.map((opt) => getI18nText(opt, locale)),
              categoryName,
            }
          : data.question.kind === 'countdown'
            ? {
                ...data.question,
                resolvedLocale: locale,
                prompt: getI18nText(data.question.prompt, locale),
                categoryName,
              }
            : data.question.kind === 'putInOrder'
              ? {
                  ...data.question,
                  resolvedLocale: locale,
                  prompt: getI18nText(data.question.prompt, locale),
                  instruction: getI18nText(data.question.instruction, locale),
                  items: data.question.items.map((item) => ({
                    ...item,
                    label: getI18nText(item.label, locale),
                    details: item.details ? getI18nText(item.details, locale) : null,
                  })),
                  categoryName,
                }
              : {
                  ...data.question,
                  resolvedLocale: locale,
                  prompt: getI18nText(data.question.prompt, locale),
                  clues: data.question.clues.map((clue) => ({
                    ...clue,
                    content: getI18nText(clue.content, locale),
                  })),
                  categoryName,
                },
    };
    store.setMatchQuestion(resolvedData);
  });

  socket.on('match:chance_card_applied', (data: MatchChanceCardAppliedPayload) => {
    logger.info('Socket event match:chance_card_applied', data);
    store.confirmOptimisticChanceCard(data);
    const qc = getQueryClient();
    if (qc) {
      void qc.invalidateQueries({ queryKey: queryKeys.store.inventory() });
    }
  });

  socket.on('match:opponent_answered', (data: MatchOpponentAnsweredPayload) => {
    logger.info('Socket event match:opponent_answered', {
      opponentTotalPoints: data.opponentTotalPoints,
      pointsEarned: data.pointsEarned,
      isCorrect: data.isCorrect,
    });
    store.setOpponentAnswered({
      matchId: data.matchId,
      qIndex: data.qIndex,
      opponentTotalPoints: data.opponentTotalPoints,
      pointsEarned: data.pointsEarned,
      isCorrect: data.isCorrect,
      selectedIndex: data.selectedIndex,
    });
  });

  socket.on('match:answer_ack', (data: MatchAnswerAckPayload) => {
    logger.info('Socket event match:answer_ack', {
      matchId: data.matchId,
      qIndex: data.qIndex,
      isCorrect: data.isCorrect,
    });
    store.setAnswerAck(data);
  });

  socket.on('match:countdown_guess_ack', (data: MatchCountdownGuessAckPayload) => {
    logger.info('Socket event match:countdown_guess_ack', {
      matchId: data.matchId,
      qIndex: data.qIndex,
      accepted: data.accepted,
      foundCount: data.foundCount,
    });
    store.setCountdownGuessAck(data);
  });

  socket.on('match:clues_guess_ack', (data: MatchCluesGuessAckPayload) => {
    logger.info('Socket event match:clues_guess_ack', {
      matchId: data.matchId,
      qIndex: data.qIndex,
      clueIndex: data.clueIndex,
      revealCount: data.revealCount,
    });
    store.setCluesGuessAck(data);
  });

  socket.on('match:round_result', (data: MatchRoundResultPayload) => {
    logger.info('Socket event match:round_result', { matchId: data.matchId, qIndex: data.qIndex });
    store.setRoundResult(data);
  });

  socket.on('match:final_results', (data: MatchFinalResultsPayload) => {
    logger.info('Socket event match:final_results', { matchId: data.matchId, winnerId: data.winnerId });
    store.setFinalResults(data);
    socket.emit('match:final_results_ack', {
      matchId: data.matchId,
      resultVersion: data.resultVersion,
    });
    const qc = getQueryClient();
    if (qc) {
      void qc.invalidateQueries({ queryKey: queryKeys.ranked.all });
      void qc.invalidateQueries({ queryKey: queryKeys.stats.all });
      void qc.invalidateQueries({ queryKey: queryKeys.store.wallet() });
      void qc.invalidateQueries({ queryKey: queryKeys.store.inventory() });
      void qc.invalidateQueries({ queryKey: queryKeys.users.all });
    }
    void getMe()
      .then((user) => {
        const current = useAuthStore.getState().user;
        if (current?.id === user.id) {
          useAuthStore.getState().setAuthenticated(user);
        }
      })
      .catch((error) => {
        logger.warn('Failed to refresh auth user after match:final_results', { error });
      });
  });

  socket.on('match:opponent_disconnected', (data: MatchOpponentDisconnectedPayload) => {
    logger.info('Socket event match:opponent_disconnected', {
      matchId: data.matchId,
      opponentId: data.opponentId,
      graceMs: data.graceMs,
    });
    store.setMatchPaused({ graceMs: data.graceMs });
  });

  socket.on('match:resume', (data: MatchResumePayload) => {
    logger.info('Socket event match:resume', { matchId: data.matchId, nextQIndex: data.nextQIndex });
    store.clearMatchPaused();
  });

  socket.on('match:rejoin_available', (data: MatchRejoinAvailablePayload) => {
    logger.info('Socket event match:rejoin_available', {
      matchId: data.matchId,
      mode: data.mode,
      opponentId: data.opponent.id,
      graceMs: data.graceMs,
    });
    store.setRejoinAvailable(data);
  });

  socket.on('ranked:search_started', (data: RankedSearchStartedPayload) => {
    logger.info('Socket event ranked:search_started', { durationMs: data.durationMs });
    useRankedMatchmakingStore.getState().setRankedSearchStarted({ durationMs: data.durationMs });
  });

  socket.on('ranked:match_found', (data: RankedMatchFoundPayload) => {
    logger.info('Socket event ranked:match_found', { lobbyId: data.lobbyId, opponentId: data.opponent.id });
    useRankedMatchmakingStore.getState().setRankedMatchFound({ opponent: data.opponent });
  });

  socket.on('ranked:queue_left', () => {
    logger.info('Socket event ranked:queue_left');
    useRankedMatchmakingStore.getState().setRankedQueueLeft();
  });

  socket.on('presence:online_count', (data: PresenceOnlineCountPayload) => {
    logger.info('Socket event presence:online_count', { onlineUsers: data.onlineUsers });
    store.setOnlineUsers(data);
  });
}

/** Reset registration state (for testing or socket reconnect). */
export function resetSocketHandlers(): void {
  _handlersRegistered = false;
  _queryClient = null;
}
