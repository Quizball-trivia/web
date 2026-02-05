import { getSocket } from './socket-client';
import { useRealtimeMatchStore } from '@/stores/realtimeMatch.store';
import { logger } from '@/utils/logger';
import type {
  DraftState,
  ErrorPayload,
  LobbyState,
  MatchAnswerAckPayload,
  MatchFinalResultsPayload,
  MatchQuestionPayload,
  MatchRoundResultPayload,
  MatchStartPayload,
} from './socket.types';

export function registerSocketHandlers(): void {
  const socket = getSocket();
  const store = useRealtimeMatchStore.getState();

  socket.off('lobby:state');
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
    logger.info('Socket event match:question', { matchId: data.matchId, qIndex: data.qIndex });
    store.setMatchQuestion(data);
  });

  socket.on('match:opponent_answered', () => {
    logger.info('Socket event match:opponent_answered');
    store.setOpponentAnswered();
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
  });
}
