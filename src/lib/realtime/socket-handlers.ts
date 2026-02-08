import { getSocket } from './socket-client';
import { useRealtimeMatchStore } from '@/stores/realtimeMatch.store';
import { logger } from '@/utils/logger';
import type {
  DraftState,
  ErrorPayload,
  LobbyState,
  MatchAnswerAckPayload,
  MatchFinalResultsPayload,
  MatchOpponentAnsweredPayload,
  MatchOpponentDisconnectedPayload,
  RankedMatchFoundPayload,
  RankedSearchStartedPayload,
  MatchQuestionPayload,
  MatchRoundResultPayload,
  MatchRejoinAvailablePayload,
  MatchResumePayload,
  MatchStartPayload,
  WarmupStatePayload,
  WarmupTappedPayload,
  WarmupOverPayload,
  WarmupRestartedPayload,
  WarmupScoresPayload,
  SessionStatePayload,
  SessionBlockedPayload,
} from './socket.types';

export function registerSocketHandlers(): void {
  const socket = getSocket();
  const store = useRealtimeMatchStore.getState();

  socket.off('lobby:state');
  socket.off('session:state');
  socket.off('session:blocked');
  socket.off('error');
  socket.off('draft:start');
  socket.off('draft:banned');
  socket.off('draft:complete');
  socket.off('match:start');
  socket.off('match:question');
  socket.off('match:opponent_answered');
  socket.off('match:answer_ack');
  socket.off('match:round_result');
  socket.off('match:final_results');
  socket.off('match:opponent_disconnected');
  socket.off('match:resume');
  socket.off('match:rejoin_available');
  socket.off('ranked:search_started');
  socket.off('ranked:match_found');
  socket.off('ranked:queue_left');
  socket.off('warmup:state');
  socket.off('warmup:tapped');
  socket.off('warmup:over');
  socket.off('warmup:restarted');
  socket.off('warmup:scores');

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
      data.code === 'RANKED_QUEUE_BUSY'
    ) {
      store.setRankedQueueLeft();
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

  socket.on('draft:complete', (data: { allowedCategoryIds: [string, string] }) => {
    logger.info('Socket event draft:complete', {
      allowedCategoryIds: data.allowedCategoryIds,
    });
    store.setDraftComplete(data.allowedCategoryIds);
  });

  socket.on('match:start', (data: MatchStartPayload) => {
    logger.info('Socket event match:start', { matchId: data.matchId, opponentId: data.opponent.id });
    store.setMatchStart(data);
  });

  socket.on('match:question', (data: MatchQuestionPayload) => {
    logger.info('Socket event match:question', {
      matchId: data.matchId,
      qIndex: data.qIndex,
      total: data.total,
      deadlineAt: data.deadlineAt,
    });
    logger.info('Question data received', {
      questionId: data.question.id,
      prompt: data.question.prompt,
      promptType: typeof data.question.prompt,
      promptLength: data.question.prompt?.length,
      options: data.question.options,
      optionsCount: data.question.options?.length,
      categoryName: data.question.categoryName,
      difficulty: data.question.difficulty,
    });
    store.setMatchQuestion(data);
  });

  socket.on('match:opponent_answered', (data: MatchOpponentAnsweredPayload) => {
    logger.info('Socket event match:opponent_answered', {
      opponentTotalPoints: data.opponentTotalPoints,
      pointsEarned: data.pointsEarned,
      isCorrect: data.isCorrect,
    });
    store.setOpponentAnswered({
      qIndex: data.qIndex,
      opponentTotalPoints: data.opponentTotalPoints,
      pointsEarned: data.pointsEarned,
      isCorrect: data.isCorrect,
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
    store.setRankedSearchStarted({ durationMs: data.durationMs });
  });

  socket.on('ranked:match_found', (data: RankedMatchFoundPayload) => {
    logger.info('Socket event ranked:match_found', { lobbyId: data.lobbyId, opponentId: data.opponent.id });
    store.setRankedMatchFound({ opponent: data.opponent });
  });

  socket.on('ranked:queue_left', () => {
    logger.info('Socket event ranked:queue_left');
    store.setRankedQueueLeft();
  });

  socket.on('warmup:state', (data: WarmupStatePayload) => {
    logger.info('Socket event warmup:state', { bounceCount: data.bounceCount, active: data.active });
    store.setWarmupState(data);
  });

  socket.on('warmup:tapped', (data: WarmupTappedPayload) => {
    logger.info('Socket event warmup:tapped', { tapperId: data.tapperId, bounceCount: data.bounceCount });
    store.setWarmupTapped(data);
  });

  socket.on('warmup:over', (data: WarmupOverPayload) => {
    logger.info('Socket event warmup:over', { finalScore: data.finalScore });
    store.setWarmupOver(data);
  });

  socket.on('warmup:restarted', (data: WarmupRestartedPayload) => {
    logger.info('Socket event warmup:restarted', { firstTurnUserId: data.firstTurnUserId });
    store.setWarmupRestarted(data);
  });

  socket.on('warmup:scores', (data: WarmupScoresPayload) => {
    logger.info('Socket event warmup:scores', data);
    store.setWarmupScores(data);
  });
}
