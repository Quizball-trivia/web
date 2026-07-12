import { getSocket, getSocketDebugSnapshot, logSocketDebug } from './socket-client';
import { useRealtimeMatchStore } from '@/stores/realtimeMatch.store';
import { useRankedMatchmakingStore } from '@/stores/rankedMatchmaking.store';
import { useGameSessionStore } from '@/stores/gameSession.store';
import { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queries/queryKeys';
import { logger } from '@/utils/logger';
import { storage, STORAGE_KEYS } from '@/utils/storage';
import { getI18nText } from '@/lib/utils/i18n';
import { translate, normalizeLocale } from '@/lib/i18n/messages';
import { toast } from 'sonner';
import { getMe } from '@/lib/api/endpoints';
import { useAuthStore } from '@/stores/auth.store';
import { selectDraftCountdownSeconds } from '@/stores/realtime-match/selectors';
import type {
  DraftState,
  ErrorPayload,
  ForceLogoutPayload,
  MatchCluesGuessAckPayload,
  MatchCountdownGuessAckPayload,
  MatchOpponentCountdownProgressPayload,
  LobbyState,
  MatchAnswerAckPayload,
  MatchFinalResultsPayload,
  MatchForfeitPendingPayload,
  MatchPartyDropoutPayload,
  MatchPartyStatePayload,
  MatchStatePayload,
  DraftOpponentDisconnectedPayload,
  DraftResumePayload,
  MatchOpponentAnsweredPayload,
  MatchOpponentDisconnectedPayload,
  RankedMatchFoundPayload,
  RankedSearchStartedPayload,
  MatchQuestionPayload,
  MatchRoundResultPayload,
  MatchCountdownPayload,
  MatchWaitingForReadyPayload,
  MatchRejoinAvailablePayload,
  MatchResumePayload,
  MatchStartPayload,
  PresenceOnlineCountPayload,
  SessionStatePayload,
  SessionBlockedPayload,
  LobbyChallengeInvitePayload,
  LobbyChallengeStatusPayload,
  NotificationPayload,
  NotificationUnreadCountPayload,
} from './socket.types';

// Module-level ref so handlers always read the latest queryClient
// without needing to tear down and re-register all listeners.
let _queryClient: QueryClient | null = null;
let _handlersRegistered = false;
let _draftUiReadyGate: { lobbyId: string; turnUserId: string; banCount: number } | null = null;
let _draftUiReadyAckedKey: string | null = null;

function getQueryClient(): QueryClient | null {
  return _queryClient;
}

function getDraftGateDebugSnapshot(atMs = Date.now()): Record<string, unknown> {
  const state = useRealtimeMatchStore.getState();
  const draft = state.draft;
  return {
    observedAtMs: atMs,
    observedAt: new Date(atMs).toISOString(),
    lobbyId: draft?.lobbyId ?? _draftUiReadyGate?.lobbyId ?? null,
    turnUserId: draft?.turnUserId ?? _draftUiReadyGate?.turnUserId ?? null,
    banCount: draft ? Object.keys(draft.bans).length : (_draftUiReadyGate?.banCount ?? null),
    gateForceAtMs: draft?.forceAtMs ?? null,
    gateForceRemainingMs:
      typeof draft?.forceAtMs === 'number' ? Math.max(0, draft.forceAtMs - atMs) : null,
    turnAnchorMs: draft?.turnAnchorMs ?? null,
    turnActive: draft?.turnActive ?? false,
    waitingForReady: draft?.waitingForReady ?? null,
    draftPaused: state.draftPaused,
    computedCountdownSeconds: draft ? selectDraftCountdownSeconds({ draft }, atMs) : null,
  };
}

function logDraftGateEvent(event: string, payload?: unknown, atMs = Date.now()): void {
  logger.info(`draft-gate-debug ${event}`, {
    payload: payload ?? null,
    ...getDraftGateDebugSnapshot(atMs),
  });
}

function emitDraftUiReadyForOpenGate(): void {
  if (!_draftUiReadyGate) return;
  const socket = getSocket();
  if (!socket.connected) return;
  const socketConnectionKey = socket.id ?? 'connected';
  const ackKey = `${_draftUiReadyGate.lobbyId}:${_draftUiReadyGate.banCount}:${socketConnectionKey}`;
  if (_draftUiReadyAckedKey === ackKey) return;

  socket.emit('draft:ui_ready', _draftUiReadyGate);
  _draftUiReadyAckedKey = ackKey;
  logDraftGateEvent('emit draft:ui_ready', {
    ..._draftUiReadyGate,
    socketId: socket.id ?? null,
  });
}

function computeServerTimeOffsetMs(serverNow: string | undefined, receivedAtMs = Date.now()): number | undefined {
  if (!serverNow) return undefined;
  const serverNowMs = new Date(serverNow).getTime();
  return Number.isFinite(serverNowMs) ? serverNowMs - receivedAtMs : undefined;
}

function isKickoffReadyGateRejoinAvailable(data: MatchRejoinAvailablePayload): boolean {
  const state = useRealtimeMatchStore.getState();
  const match = state.match;
  return Boolean(
    match?.matchId === data.matchId &&
      match.waitingForReady?.phase === 'kickoff' &&
      match.currentQuestion === null &&
      !match.finalResults &&
      state.autoRejoinSuppressedMatchId !== data.matchId
  );
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

  socket.on('connect', () => {
    // Clear the dedupe on EVERY connect: with Socket.IO connection-state
    // recovery a reconnect can keep the same socket.id, which would otherwise
    // skip the ui_ready re-emit the server's gate needs.
    _draftUiReadyAckedKey = null;
    if (useRealtimeMatchStore.getState().draft || _draftUiReadyGate) {
      logDraftGateEvent('socket connect during draft', {
        socketId: socket.id ?? null,
        connected: socket.connected,
      });
    }
    emitDraftUiReadyForOpenGate();
  });

  socket.on('disconnect', (reason) => {
    if (useRealtimeMatchStore.getState().draft || _draftUiReadyGate) {
      logDraftGateEvent('socket disconnect during draft', {
        socketId: socket.id ?? null,
        connected: socket.connected,
        reason,
      });
    }
  });

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

  socket.on('auth:force_logout', async (data: ForceLogoutPayload) => {
    logger.warn('Socket event auth:force_logout', data);
    // Pull locale from storage; this module isn't a React component so we can't use useLocale().
    const locale = normalizeLocale(storage.get<string>(STORAGE_KEYS.LOCALE, 'en'));
    toast.error(translate(locale, 'auth.sessionEnded'));
    try {
      await useAuthStore.getState().logout();
    } catch (err) {
      logger.warn('Failed to call logout() after force_logout', err);
    }
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  });

  socket.on('notification:new', (data: NotificationPayload) => {
    logger.info('Socket event notification:new', { notificationId: data.id, type: data.type });
    const queryClient = getQueryClient();
    queryClient?.invalidateQueries({ queryKey: queryKeys.notifications.all });
    const locale = normalizeLocale(storage.get<string>(STORAGE_KEYS.LOCALE, 'en'));
    const title = getI18nText(data.title, locale);
    if (title) toast.info(title);
  });

  socket.on('notification:unread_count', (data: NotificationUnreadCountPayload) => {
    logger.info('Socket event notification:unread_count', data);
    const queryClient = getQueryClient();
    queryClient?.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount() });
    queryClient?.invalidateQueries({ queryKey: queryKeys.notifications.list() });
  });

  socket.on('lobby:state', (data: LobbyState) => {
    const selfUserId = useRealtimeMatchStore.getState().selfUserId;
    logger.info('Socket event lobby:state', {
      lobbyId: data.lobbyId,
      status: data.status,
      memberCount: data.members.length,
      memberIds: data.members.map((member) => member.userId),
      selfUserId,
    });
    if (selfUserId && !data.members.some((member) => member.userId === selfUserId)) {
      logger.warn('Ignoring lobby state that does not include current user', {
        lobbyId: data.lobbyId,
        selfUserId,
        memberIds: data.members.map((member) => member.userId),
      });
      return;
    }
    const rankedState = useRankedMatchmakingStore.getState();
    if (data.mode === 'ranked' && rankedState.rankedCancelRequestedAt !== null && data.status !== 'closed') {
      logger.warn('Ignoring ranked lobby state after local cancel request', {
        lobbyId: data.lobbyId,
        status: data.status,
        cancelledAt: rankedState.rankedCancelRequestedAt,
      });
      return;
    }
    store.setLobby(data);
  });

  socket.on('lobby:challenge_received', (data: LobbyChallengeInvitePayload) => {
    logger.info('Socket event lobby:challenge_received', {
      invitationId: data.invitationId,
      lobbyId: data.lobbyId,
      fromUserId: data.fromUser.id,
    });
    useRealtimeMatchStore.getState().addChallengeInvite(data);
    const locale = normalizeLocale(storage.get<string>(STORAGE_KEYS.LOCALE, 'en'));
    toast.info(translate(locale, 'notifications.challengeReceivedToast', { name: data.fromUser.username }));
  });

  socket.on('lobby:challenge_status', (data: LobbyChallengeStatusPayload) => {
    logger.info('Socket event lobby:challenge_status', data);
    useRealtimeMatchStore.getState().removeChallengeInvite(data.invitationId);
    const locale = normalizeLocale(storage.get<string>(STORAGE_KEYS.LOCALE, 'en'));
    if (data.status === 'accepted') {
      toast.success(translate(locale, 'notifications.challengeAccepted'));
    } else if (data.status === 'declined') {
      toast.info(translate(locale, 'notifications.challengeDeclined'));
    } else if (data.status === 'expired') {
      toast.info(translate(locale, 'notifications.challengeExpired'));
    }
  });

  socket.on('error', (data: ErrorPayload) => {
    logger.warn('Socket event error', { code: data.code, message: data.message, meta: data.meta });
    if (data.code === 'MATCH_ABANDONED') {
      const current = useRealtimeMatchStore.getState();
      const matchId = current.match?.matchId ?? current.sessionState?.activeMatchId;
      if (matchId) {
        const rejoinMode = current.rejoinMatch?.matchId === matchId
          ? current.rejoinMatch.mode
          : null;
        const gameSession = useGameSessionStore.getState();
        const sessionMode = gameSession.stage === 'playing'
          ? gameSession.config?.matchType
          : null;
        current.setMatchCancelled({
          matchId,
          ticketRefunded: (current.match?.mode ?? rejoinMode ?? sessionMode) === 'ranked',
        });
        const qc = getQueryClient();
        if (qc) {
          void qc.invalidateQueries({ queryKey: queryKeys.store.wallet() });
          void qc.invalidateQueries({ queryKey: queryKeys.ranked.profile() });
        }
        return;
      }
    }
    if (
      data.code === 'RANKED_QUEUE_BLOCKED' ||
      data.code === 'RANKED_QUEUE_UNAVAILABLE' ||
      data.code === 'RANKED_QUEUE_BUSY' ||
      data.code === 'INSUFFICIENT_TICKETS'
    ) {
      logSocketDebug('ranked socket error', {
        code: data.code,
        message: data.message,
        meta: data.meta ?? null,
        ...getSocketDebugSnapshot(socket),
      });
      useRankedMatchmakingStore.getState().setRankedQueueLeft('socket_error');
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

    if (data.code === 'INSUFFICIENT_TICKETS') {
      // Localize by error code — the server message is English-only, and the
      // errors.* namespace already carries en + ka strings for this code.
      const locale = normalizeLocale(storage.get<string>(STORAGE_KEYS.LOCALE, 'en'));
      toast.error(translate(locale, 'errors.INSUFFICIENT_TICKETS'));
      const qc = getQueryClient();
      if (qc) {
        void qc.invalidateQueries({ queryKey: queryKeys.store.wallet() });
      }
    }
    store.setError(data);
  });

  socket.on('draft:start', (data: DraftState) => {
    const receivedAtMs = Date.now();
    store.clearError();
    store.setDraftStart(data);
    _draftUiReadyGate = {
      lobbyId: data.lobbyId,
      turnUserId: data.turnUserId,
      banCount: Object.keys(useRealtimeMatchStore.getState().draft?.bans ?? {}).length,
    };
    logDraftGateEvent('received draft:start', {
      ...data,
      categoryCount: data.categories.length,
    }, receivedAtMs);
    emitDraftUiReadyForOpenGate();
  });

  socket.on('draft:waiting_for_ready', (data) => {
    const receivedAtMs = Date.now();
    store.setDraftWaitingForReady(data);
    const state = useRealtimeMatchStore.getState();
    const draft = state.draft;
    if (draft?.lobbyId === data.lobbyId && draft.turnUserId) {
      _draftUiReadyGate = {
        lobbyId: data.lobbyId,
        turnUserId: draft.turnUserId,
        banCount: Object.keys(draft.bans).length,
      };
      if (state.selfUserId && data.waitingUserIds.includes(state.selfUserId)) {
        _draftUiReadyAckedKey = null;
      }
      logDraftGateEvent('received draft:waiting_for_ready', data, receivedAtMs);
      emitDraftUiReadyForOpenGate();
    } else {
      logDraftGateEvent('received draft:waiting_for_ready', data, receivedAtMs);
    }
  });

  socket.on('draft:begin', (data) => {
    const receivedAtMs = Date.now();
    _draftUiReadyGate = null;
    _draftUiReadyAckedKey = null;
    store.setDraftBegin(data);
    logDraftGateEvent('received draft:begin', data, receivedAtMs);
  });

  socket.on('draft:banned', (data: {
    actorId: string;
    categoryId: string;
    turnUserId?: string | null;
    forceAtMs?: number | null;
  }) => {
    const receivedAtMs = Date.now();
    store.setDraftBan(data.actorId, data.categoryId, data.forceAtMs, data.turnUserId);
    const draft = useRealtimeMatchStore.getState().draft;
    if (draft?.turnUserId && !draft.halfOneCategoryId) {
      _draftUiReadyGate = {
        lobbyId: draft.lobbyId,
        turnUserId: draft.turnUserId,
        banCount: Object.keys(draft.bans).length,
      };
      logDraftGateEvent('received draft:banned', data, receivedAtMs);
      emitDraftUiReadyForOpenGate();
    } else {
      logDraftGateEvent('received draft:banned', data, receivedAtMs);
    }
  });

  socket.on('draft:complete', (data: { halfOneCategoryId: string }) => {
    logger.info('Socket event draft:complete', {
      halfOneCategoryId: data.halfOneCategoryId,
    });
    _draftUiReadyGate = null;
    _draftUiReadyAckedKey = null;
    store.setDraftComplete(data.halfOneCategoryId);
  });

  socket.on('draft:opponent_disconnected', (data: DraftOpponentDisconnectedPayload) => {
    const receivedAtMs = Date.now();
    store.setDraftPaused(data);
    logDraftGateEvent('received draft:opponent_disconnected', data, receivedAtMs);
  });

  socket.on('draft:resume', (data: DraftResumePayload) => {
    const receivedAtMs = Date.now();
    store.clearDraftPaused();
    logDraftGateEvent('received draft:resume', data, receivedAtMs);
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
    const serverTimeOffsetMs = computeServerTimeOffsetMs(data.serverNow);
    logger.info('Socket event match:countdown', {
      matchId: data.matchId,
      seconds: data.seconds,
      startsAt: data.startsAt,
      reason: data.reason,
      serverTimeOffsetMs,
    });
    store.setMatchCountdown({ ...data, serverTimeOffsetMs });
  });

  socket.on('match:waiting_for_ready', (data: MatchWaitingForReadyPayload) => {
    const serverTimeOffsetMs = computeServerTimeOffsetMs(data.serverNow);
    logger.info('Socket event match:waiting_for_ready', {
      matchId: data.matchId,
      phase: data.phase,
      readyCount: data.readyCount,
      totalCount: data.totalCount,
      readyUserIds: data.readyUserIds,
      waitingUserIds: data.waitingUserIds,
      forceStartsAt: data.forceStartsAt,
      serverTimeOffsetMs,
    });
    store.setMatchWaitingForReady({ ...data, serverTimeOffsetMs });
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
    try {
    const serverTimeOffsetMs = computeServerTimeOffsetMs(data.serverNow);
    logger.info('Socket event match:question', {
      matchId: data.matchId,
      qIndex: data.qIndex,
      total: data.total,
      deadlineAt: data.deadlineAt,
      questionKind: data.question.kind,
      serverTimeOffsetMs,
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
      serverTimeOffsetMs,
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
                  // Defensive: a malformed payload without a clues array used
                  // to throw inside this socket callback, silently swallowing
                  // the question — the client then waited on the previous
                  // screen forever (no error boundary catches socket handlers).
                  clues: (Array.isArray(data.question.clues) ? data.question.clues : []).map((clue) => ({
                    ...clue,
                    content: getI18nText(clue.content, locale),
                  })),
                  categoryName,
                },
    };
    store.setMatchQuestion(resolvedData);
    } catch (error) {
      // A throw here used to vanish the question entirely (the store never
      // received it and the match froze on the previous screen with no UI
      // error). Log loudly instead — the server-side round timeout will still
      // resolve the round even if this client cannot render the question.
      logger.error('Failed to process match:question payload', {
        matchId: data?.matchId,
        qIndex: data?.qIndex,
        questionKind: data?.question?.kind,
        error: error instanceof Error ? error.message : String(error),
      });
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

  socket.on('match:opponent_countdown_progress', (data: MatchOpponentCountdownProgressPayload) => {
    logger.info('Socket event match:opponent_countdown_progress', {
      matchId: data.matchId,
      qIndex: data.qIndex,
      foundCount: data.foundCount,
    });
    store.setOpponentCountdownProgress(data);
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
    const selfUserId = useRealtimeMatchStore.getState().selfUserId;
    const myRankedOutcome = selfUserId ? data.rankedOutcome?.byUserId[selfUserId] : null;
    logger.info('Socket event match:final_results', {
      matchId: data.matchId,
      winnerId: data.winnerId,
      resultVersion: data.resultVersion,
      selfUserId,
      hasRankedOutcome: data.rankedOutcome != null,
      rankedOutcomeUserIds: data.rankedOutcome ? Object.keys(data.rankedOutcome.byUserId) : [],
      myRankedOutcome: myRankedOutcome
        ? {
          oldRp: myRankedOutcome.oldRp,
          newRp: myRankedOutcome.newRp,
          deltaRp: myRankedOutcome.deltaRp,
          placementStatus: myRankedOutcome.placementStatus,
          placementPlayed: myRankedOutcome.placementPlayed,
          placementRequired: myRankedOutcome.placementRequired,
          isPlacement: myRankedOutcome.isPlacement,
        }
        : null,
    });
    store.setFinalResults(data);
    socket.emit('match:final_results_ack', {
      matchId: data.matchId,
      resultVersion: data.resultVersion,
    });
    const qc = getQueryClient();
    if (qc) {
      if (myRankedOutcome) {
        qc.setQueryData(queryKeys.ranked.profile(), (current: unknown) => {
          if (!current || typeof current !== 'object') return current;
          const currentProfile = current as {
            rp?: number;
            tier?: string;
            placementStatus?: string;
            placementPlayed?: number;
            placementRequired?: number;
          };
          logger.info('Patching ranked profile cache from match:final_results', {
            matchId: data.matchId,
            currentRp: currentProfile.rp ?? null,
            nextRp: myRankedOutcome.newRp,
            currentTier: currentProfile.tier ?? null,
            nextTier: myRankedOutcome.newTier,
            currentPlacementStatus: currentProfile.placementStatus ?? null,
            nextPlacementStatus: myRankedOutcome.placementStatus,
          });
          return {
            ...current,
            rp: myRankedOutcome.newRp,
            tier: myRankedOutcome.newTier,
            placementStatus: myRankedOutcome.placementStatus,
            placementPlayed: myRankedOutcome.placementPlayed,
            placementRequired: myRankedOutcome.placementRequired,
          };
        });
      } else {
        logger.warn('match:final_results arrived without rankedOutcome for current user', {
          matchId: data.matchId,
          selfUserId,
          rankedOutcomeUserIds: data.rankedOutcome ? Object.keys(data.rankedOutcome.byUserId) : [],
        });
      }
      void qc.invalidateQueries({ queryKey: queryKeys.ranked.all });
      void qc.invalidateQueries({ queryKey: queryKeys.stats.all });
      void qc.invalidateQueries({ queryKey: queryKeys.store.wallet() });
      void qc.invalidateQueries({ queryKey: queryKeys.store.inventory() });
      void qc.invalidateQueries({ queryKey: queryKeys.users.all });
      logger.info('Invalidated post-match queries after match:final_results', {
        matchId: data.matchId,
        invalidated: ['ranked.all', 'stats.all', 'store.wallet', 'store.inventory', 'users.all'],
      });
    }
    void getMe()
      .then((user) => {
        const current = useAuthStore.getState().user;
        if (current?.id === user.id) {
          useAuthStore.getState().setAuthenticated(user);
          logger.info('Refreshed auth user after match:final_results', {
            matchId: data.matchId,
            userId: user.id,
          });
        }
      })
      .catch((error) => {
        logger.warn('Failed to refresh auth user after match:final_results', { error });
      });
  });

  socket.on('match:forfeit_pending', (data: MatchForfeitPendingPayload) => {
    logger.warn('Socket event match:forfeit_pending', {
      matchId: data.matchId,
      reason: data.reason,
    });
    store.setForfeitPending(data);
  });

  socket.on('match:opponent_disconnected', (data: MatchOpponentDisconnectedPayload) => {
    logger.info('Socket event match:opponent_disconnected', {
      matchId: data.matchId,
      opponentId: data.opponentId,
      graceMs: data.graceMs,
      remainingReconnects: data.remainingReconnects,
    });
    store.setMatchPaused({
      graceMs: data.graceMs,
      remainingReconnects: data.remainingReconnects,
    });
  });

  socket.on('match:party_dropout', (data: MatchPartyDropoutPayload) => {
    logger.warn('Socket event match:party_dropout', {
      matchId: data.matchId,
      reason: data.reason,
    });
    store.setPartyDropout(data);
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
      remainingReconnects: data.remainingReconnects,
    });
    store.setRejoinAvailable(data);
    if (isKickoffReadyGateRejoinAvailable(data)) {
      socket.emit('match:rejoin', { matchId: data.matchId });
      store.clearRejoinAvailable();
      logger.info('Socket emit match:rejoin from kickoff ready gate', { matchId: data.matchId });
    }
  });

  socket.on('ranked:search_started', (data: RankedSearchStartedPayload) => {
    logger.info('Socket event ranked:search_started', { durationMs: data.durationMs });
    logSocketDebug('ranked search_started ack', {
      durationMs: data.durationMs,
      ...getSocketDebugSnapshot(socket),
    });
    store.clearError();
    useRankedMatchmakingStore.getState().setRankedSearchStarted({ durationMs: data.durationMs });
  });

  socket.on('ranked:match_found', (data: RankedMatchFoundPayload) => {
    logger.info('Socket event ranked:match_found', { lobbyId: data.lobbyId, opponentId: data.opponent.id });
    logSocketDebug('ranked match_found ack', {
      lobbyId: data.lobbyId,
      opponentId: data.opponent.id,
      isAiOpponent: (data.opponent as { isAiOpponent?: boolean }).isAiOpponent ?? null,
      ...getSocketDebugSnapshot(socket),
    });
    store.clearError();
    useRankedMatchmakingStore.getState().setRankedMatchFound({
      opponent: data.opponent,
      myRecentForm: data.myRecentForm,
    });
  });

  socket.on('ranked:queue_left', () => {
    logger.info('Socket event ranked:queue_left');
    logSocketDebug('ranked queue_left event', getSocketDebugSnapshot(socket));
    useRankedMatchmakingStore.getState().setRankedQueueLeft('server_event');
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
  _draftUiReadyGate = null;
  _draftUiReadyAckedKey = null;
}
