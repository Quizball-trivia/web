import { getSocket, getSocketDebugSnapshot, logSocketDebug } from './socket-client';
import { useRealtimeMatchStore } from '@/stores/realtimeMatch.store';
import { useRankedMatchmakingStore } from '@/stores/rankedMatchmaking.store';
import { useAuctionActiveMatchStore } from '@/stores/auctionActiveMatch.store';
import { useFootballGridStore } from '@/stores/footballGrid.store';
import { useGameSessionStore } from '@/stores/gameSession.store';
import { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queries/queryKeys';
import { logger } from '@/utils/logger';
import { storage, STORAGE_KEYS } from '@/utils/storage';
import { getI18nText } from '@/lib/utils/i18n';
import { applySystemStatus, type SystemStatusPayload } from '@/lib/realtime/system-status';
import { translate, normalizeLocale } from '@/lib/i18n/messages';
import { toast } from 'sonner';
import { getMe } from '@/lib/api/endpoints';
import { useAuthStore } from '@/stores/auth.store';
import { createRealtimeCommandId } from '@/lib/realtime/command-id';
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
  AuctionStatePayload,
  AuctionRejoinAvailablePayload,
  AuctionMatchFinishedPayload,
  AuctionPlayerForfeitedPayload,
  FootballGridCommandResultPayload,
  FootballGridCompletedPayload,
  FootballGridMatchFoundPayload,
  FootballGridRematchStatePayload,
  FootballGridSearchStatePayload,
  FootballGridStatePayload,
  FootballGridTurnResolvedPayload,
} from './socket.types';

// Module-level ref so handlers always read the latest queryClient
// without needing to tear down and re-register all listeners.
let _queryClient: QueryClient | null = null;
let _handlersRegistered = false;
// The backend pairs error(DB_WRITE_OUTAGE) with an immediate ranked:queue_left
// (no payload). The generic queue_left handler would otherwise overwrite the
// db_write_outage source with 'server_event' and re-bump the seq — defeating
// the outage notice and letting the router treat it as a recoverable lost boot.
// We stamp the outage here and let the queue_left handler preserve the source
// for a short window.
let _lastDbOutageErrorAtMs = 0;
const DB_OUTAGE_QUEUE_LEFT_WINDOW_MS = 3_000;
const GRID_RESYNC_THROTTLE_MS = 1_000;
const GRID_CANCEL_BUSY_MAX_RETRIES = 3;
const GRID_CANCEL_BUSY_RETRY_MS = 800;
let _gridCancelBusyRetries = 0;
const _lastGridResyncAtByMatchId = new Map<string, number>();
/**
 * Grid matches this client had loaded before the current search started. Only
 * these may have a late redelivered result suppressed in favour of the PLAY
 * intent; a match produced BY the current search must always surface.
 *
 * Marked by the caller at PLAY time — the store is cleared by beginFreshSearch()
 * before any server search_state arrives, so it cannot be read back later.
 */
const _gridMatchesSeenBeforeSearch = new Set<string>();

/** Call with the outgoing match id immediately BEFORE beginFreshSearch(). */
export function markGridMatchLeftBehind(matchId: string | null | undefined): void {
  if (!matchId) return;
  _gridMatchesSeenBeforeSearch.add(matchId);
  // Bound the set: only recent departures matter for suppression.
  if (_gridMatchesSeenBeforeSearch.size > 8) {
    const oldest = _gridMatchesSeenBeforeSearch.values().next().value;
    if (oldest) _gridMatchesSeenBeforeSearch.delete(oldest);
  }
}

function emitGridResyncThrottled(socket: ReturnType<typeof getSocket>, matchId: string): void {
  const now = Date.now();
  const lastEmittedAt = _lastGridResyncAtByMatchId.get(matchId) ?? 0;
  if (now - lastEmittedAt < GRID_RESYNC_THROTTLE_MS) return;
  _lastGridResyncAtByMatchId.set(matchId, now);
  socket.emit('grid:resync', { matchId });
}

function getQueryClient(): QueryClient | null {
  return _queryClient;
}

function computeServerTimeOffsetMs(serverNow: string | undefined, receivedAtMs = Date.now()): number | undefined {
  if (!serverNow) return undefined;
  const serverNowMs = new Date(serverNow).getTime();
  return Number.isFinite(serverNowMs) ? serverNowMs - receivedAtMs : undefined;
}

function shouldAutoRejoinActiveMatch(data: MatchRejoinAvailablePayload): boolean {
  const state = useRealtimeMatchStore.getState();
  const match = state.match;
  return Boolean(
    match?.matchId === data.matchId &&
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
    // DB write outage (INC-2026-07-29): the server refused the queue join
    // BEFORE spending a ticket and paired this error with ranked:queue_left.
    // Tag the queue-left with a dedicated source so the router does NOT treat
    // it as a lost boot to recover, and so the map surfaces the reassuring
    // "ticket wasn't used, retrying" notice instead of a scary error.
    if (data.code === 'DB_WRITE_OUTAGE') {
      logSocketDebug('ranked db write outage', {
        code: data.code,
        message: data.message,
        ...getSocketDebugSnapshot(socket),
      });
      _lastDbOutageErrorAtMs = Date.now();
      useRankedMatchmakingStore.getState().setRankedQueueLeft('db_write_outage');
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

  // Read-only DB outage signal (INC-2026-07-29). Broadcast on breaker state
  // edges and sent to each socket on connect, so a client that connects mid-
  // outage renders the degraded UI immediately. Feeds the system-status store,
  // which drives the paused-matchmaking notice, the in-match "paused, protected"
  // pill, and the green "Back online" recovery pulse.
  socket.on('system:status', (data: SystemStatusPayload) => {
    logger.info('Socket event system:status', {
      degraded: data.degraded,
      reason: data.reason,
      matchmaking: data.matchmaking,
    });
    applySystemStatus(data);
  });

  socket.on('draft:start', (data: DraftState) => {
    logger.info('Socket event draft:start', {
      lobbyId: data.lobbyId,
      categoryCount: data.categories.length,
      turnUserId: data.turnUserId,
    });
    store.clearError();
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

  socket.on('draft:opponent_disconnected', (data: DraftOpponentDisconnectedPayload) => {
    logger.info('Socket event draft:opponent_disconnected', {
      lobbyId: data.lobbyId,
      opponentId: data.opponentId,
      graceMs: data.graceMs,
    });
    store.setDraftPaused(data);
  });

  socket.on('draft:resume', (data: DraftResumePayload) => {
    logger.info('Socket event draft:resume', { lobbyId: data.lobbyId });
    store.clearDraftPaused();
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
      if (typeof myRankedOutcome?.qpWeekTotal === 'number') {
        // The settlement carries the authoritative running QP balance — patch
        // the cached Weekend League snapshot so the league card is correct
        // even before the invalidation refetch lands.
        const qpTotal = myRankedOutcome.qpWeekTotal;
        qc.setQueryData(queryKeys.weekendLeague.current(), (current: unknown) => {
          if (!current || typeof current !== 'object') return current;
          const snapshot = current as {
            you?: { qp?: { points: number; target: number; qualified: boolean } } | null;
          };
          if (!snapshot.you?.qp) return current;
          const qp = snapshot.you.qp;
          return {
            ...snapshot,
            you: {
              ...snapshot.you,
              qp: {
                ...qp,
                points: qpTotal,
                qualified: qp.qualified || qpTotal >= qp.target,
              },
            },
          };
        });
      }
      void qc.invalidateQueries({ queryKey: queryKeys.ranked.all });
      void qc.invalidateQueries({ queryKey: queryKeys.stats.all });
      void qc.invalidateQueries({ queryKey: queryKeys.store.wallet() });
      void qc.invalidateQueries({ queryKey: queryKeys.store.inventory() });
      void qc.invalidateQueries({ queryKey: queryKeys.users.all });
      void qc.invalidateQueries({ queryKey: queryKeys.weekendLeague.all });
      logger.info('Invalidated post-match queries after match:final_results', {
        matchId: data.matchId,
        invalidated: ['ranked.all', 'stats.all', 'store.wallet', 'store.inventory', 'users.all', 'weekendLeague.all'],
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
    // A live game can receive more than one reconnect offer for the same match
    // during socket handoff/flapping. Accept every offer while the same match is
    // still active locally; routing/banner recovery is only needed for a cold
    // page whose match store was lost.
    if (shouldAutoRejoinActiveMatch(data)) {
      socket.emit('match:rejoin', { matchId: data.matchId });
      store.clearRejoinAvailable();
      logger.info('Socket emit match:rejoin for active match recovery', { matchId: data.matchId });
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
    // Preserve the db_write_outage source when this queue_left is the one the
    // backend paired with a just-received DB_WRITE_OUTAGE error — otherwise the
    // router would see 'server_event' and could try to recover a "lost boot",
    // and the outage notice would be lost.
    const source = Date.now() - _lastDbOutageErrorAtMs < DB_OUTAGE_QUEUE_LEFT_WINDOW_MS
      ? 'db_write_outage'
      : 'server_event';
    useRankedMatchmakingStore.getState().setRankedQueueLeft(source);
  });

  socket.on('presence:online_count', (data: PresenceOnlineCountPayload) => {
    logger.info('Socket event presence:online_count', { onlineUsers: data.onlineUsers });
    store.setOnlineUsers(data);
  });

  // Auction out-of-match affordance. The auction realtime layer only mounts on
  // `/auction`; these app-wide handlers capture the server's connect-time
  // handshake (rejoinActiveAuctionMatchOnConnect) while the user is elsewhere,
  // feeding the AppShell "still in an auction — rejoin" banner. On `/auction`
  // the local `useRealtimeAuctionMatch` owns the flow — the banner is route-
  // gated off there, so these writes are harmless (they only feed the banner).
  const auctionStore = useAuctionActiveMatchStore.getState();
  socket.on('auction:state', (data: AuctionStatePayload) => {
    const selfUserId = useRealtimeMatchStore.getState().selfUserId;
    auctionStore.setFromState(data, selfUserId);
  });
  socket.on('auction:rejoin_available', (data: AuctionRejoinAvailablePayload) => {
    logger.info('Socket event auction:rejoin_available', { matchId: data.matchId });
    auctionStore.setFromRejoinAvailable(data);
  });
  socket.on('auction:match_finished', (data: AuctionMatchFinishedPayload) => {
    const selfUserId = useRealtimeMatchStore.getState().selfUserId;
    if (!selfUserId || data.state.seats.some((seat) => seat.userId === selfUserId)) {
      auctionStore.clear();
    }
  });
  socket.on('auction:player_forfeited', (data: AuctionPlayerForfeitedPayload) => {
    const selfUserId = useRealtimeMatchStore.getState().selfUserId;
    if (data.userId === selfUserId) {
      auctionStore.clear();
    }
  });

  // Football Grid is route-independent in the same way as Auction: match
  // handoff and reconnect snapshots can arrive while the player is still in a
  // friend lobby or elsewhere in the app. Keep the authoritative payloads in
  // one global store, then let `/football-grid` render and acknowledge them.
  socket.on('grid:search_state', (data: FootballGridSearchStatePayload) => {
    logger.info('Socket event grid:search_state', {
      state: data.state,
      searchId: data.searchId,
    });
    const gridStore = useFootballGridStore.getState();
    if (data.state === 'idle') _gridCancelBusyRetries = 0;
    if (gridStore.searchCancellationPending && data.state === 'searching' && data.searchId) {
      socket.emit('grid:search_cancel', { searchId: data.searchId });
    }
    gridStore.setSearchState(data);
  });
  socket.on('grid:match_found', (data: FootballGridMatchFoundPayload) => {
    const gridStore = useFootballGridStore.getState();
    logger.info('Socket event grid:match_found', {
      matchId: data.matchId,
      opponentId: data.opponent.id,
      stateVersion: data.state.stateVersion,
    });
    // If matching won the race against a cancellation, end the just-created
    // handoff immediately. The route that initiated the search may already be
    // unmounted, so this cleanup must remain global to avoid stranding the
    // opponent in the handoff timeout.
    if (gridStore.searchCancellationPending) {
      socket.emit('grid:forfeit', {
        matchId: data.matchId,
        commandId: createRealtimeCommandId(),
        expectedStateVersion: data.state.stateVersion,
      });
    }
    gridStore.setMatchFound(data);
  });
  const applyGridState = (eventName: string, data: FootballGridStatePayload) => {
    logger.info(`Socket event ${eventName}`, {
      matchId: data.matchId,
      phase: data.state.phase,
      stateVersion: data.state.stateVersion,
    });
    useFootballGridStore.getState().setState(data);
  };
  socket.on('grid:loading_state', (data) => applyGridState('grid:loading_state', data));
  socket.on('grid:countdown', (data) => applyGridState('grid:countdown', data));
  socket.on('grid:state', (data) => applyGridState('grid:state', data));
  socket.on('grid:paused', (data) => applyGridState('grid:paused', data));
  socket.on('grid:resumed', (data) => applyGridState('grid:resumed', data));
  socket.on('grid:turn_resolved', (data: FootballGridTurnResolvedPayload) => {
    logger.info('Socket event grid:turn_resolved', {
      matchId: data.matchId,
      stateVersion: data.state.stateVersion,
      outcome: data.outcome,
    });
    useFootballGridStore.getState().setTurnResolved(data);
  });
  socket.on('grid:command_result', (data: FootballGridCommandResultPayload) => {
    logger.info('Socket event grid:command_result', {
      matchId: data.matchId,
      commandId: data.commandId,
      outcome: data.outcome,
    });
    useFootballGridStore.getState().setCommandResult(data);
  });
  socket.on('grid:completed', (data: FootballGridCompletedPayload) => {
    logger.info('Socket event grid:completed', {
      matchId: data.matchId,
      stateVersion: data.terminalStateVersion,
      completionReason: data.state.completionReason,
    });
    _lastGridResyncAtByMatchId.delete(data.matchId);
    const gridStore = useFootballGridStore.getState();
    // Outbox redelivery of a match that ended while the user was away can race
    // a fresh PLAY press. Suppress ONLY a completion for a match this client
    // provably left behind — one it had loaded before the current search began.
    // Inferring staleness from "searching and no local state" would also eat
    // the result of the match this search just produced, whenever grid:match_found
    // is delayed or dropped (the client sits at search_state 'matched' with no
    // state yet, and its real result would vanish along with its rewards and
    // rematch offer).
    const staleWhileSearching = gridStore.search.state === 'searching'
      && gridStore.state?.matchId !== data.matchId
      && _gridMatchesSeenBeforeSearch.has(data.matchId);
    if (staleWhileSearching) {
      socket.emit('grid:completed_ack', {
        matchId: data.matchId,
        terminalStateVersion: data.terminalStateVersion,
        ackToken: data.ackToken,
      });
      return;
    }
    gridStore.setCompleted(data);
  });
  socket.on('grid:rematch_state', (data: FootballGridRematchStatePayload) => {
    logger.info('Socket event grid:rematch_state', {
      seriesId: data.seriesId,
      seriesVersion: data.seriesVersion,
      status: data.status,
      acceptedPlayers: data.acceptedUserIds.length,
    });
    useFootballGridStore.getState().setRematch(data);
  });
  socket.on('grid:report_received', ({ attemptId }) => {
    logger.info('Socket event grid:report_received', { attemptId });
    useFootballGridStore.getState().markAttemptReported(attemptId);
  });
  socket.on('grid:error', (data: ErrorPayload) => {
    logger.warn('Socket event grid:error', {
      code: data.code,
      gridCode: data.meta?.gridCode ?? null,
      message: data.message,
    });
    const current = useFootballGridStore.getState();
    // A cancel sent within ~1s of grid:search_state can find the search-start
    // path still holding the user session lock. The server never re-emits a
    // search state after that, so without a retry the player stays queued
    // while the UI believes the cancel went through.
    if (data.code === 'GRID_SEARCH_BUSY' && current.searchCancellationPending && current.search.searchId
      && _gridCancelBusyRetries < GRID_CANCEL_BUSY_MAX_RETRIES) {
      _gridCancelBusyRetries += 1;
      const searchId = current.search.searchId;
      setTimeout(() => {
        const latest = useFootballGridStore.getState();
        if (latest.searchCancellationPending && latest.search.searchId === searchId) {
          socket.emit('grid:search_cancel', { searchId });
        }
      }, GRID_CANCEL_BUSY_RETRY_MS);
      return;
    }
    current.setError(data);
    const gridCode = typeof data.meta?.gridCode === 'string' ? data.meta.gridCode : data.code;
    if (
      current.state?.matchId &&
      (gridCode === 'STALE_STATE' || gridCode === 'LATE_COMMAND' || gridCode === 'COMMAND_IN_PROGRESS')
    ) {
      emitGridResyncThrottled(socket, current.state.matchId);
    }
  });
}

/** Reset registration state (for testing or socket reconnect). */
export function resetSocketHandlers(): void {
  _handlersRegistered = false;
  _gridCancelBusyRetries = 0;
  _queryClient = null;
  _lastDbOutageErrorAtMs = 0;
  _lastGridResyncAtByMatchId.clear();
}
