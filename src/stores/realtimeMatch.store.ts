import { create } from 'zustand';
import { logger } from '@/utils/logger';
import type {
  DraftCategory,
  DraftState,
  LobbyState,
  MatchAnswerAckPayload,
  MatchFinalResultsPayload,
  MatchQuestionPayload,
  MatchRoundResultPayload,
  MatchStartPayload,
  OpponentInfo,
} from '@/lib/realtime/socket.types';

export interface DraftStatus {
  lobbyId: string;
  categories: DraftCategory[];
  bans: Record<string, string>;
  turnUserId: string | null;
  allowedCategoryIds: [string, string] | null;
}

export interface MatchQuestionState {
  payload: MatchQuestionPayload;
  correctIndex?: number;
}

export interface MatchStatus {
  matchId: string;
  opponent: OpponentInfo;
  currentQuestion: MatchQuestionPayload | null;
  questions: Record<number, MatchQuestionState>;
  answerAck: MatchAnswerAckPayload | null;
  opponentAnswered: boolean;
  myTotalPoints: number;
  oppTotalPoints: number;
  lastRoundResult: MatchRoundResultPayload | null;
  finalResults: MatchFinalResultsPayload | null;
}

interface RealtimeState {
  lobby: LobbyState | null;
  draft: DraftStatus | null;
  match: MatchStatus | null;
  selfUserId: string | null;
  setSelfUserId: (userId: string | null) => void;
  setLobby: (lobby: LobbyState) => void;
  setDraftStart: (draft: DraftState) => void;
  setDraftBan: (actorId: string, categoryId: string) => void;
  setDraftComplete: (allowed: [string, string]) => void;
  setMatchStart: (payload: MatchStartPayload) => void;
  setMatchQuestion: (payload: MatchQuestionPayload) => void;
  setAnswerAck: (payload: MatchAnswerAckPayload) => void;
  setOpponentAnswered: () => void;
  setRoundResult: (payload: MatchRoundResultPayload) => void;
  setFinalResults: (payload: MatchFinalResultsPayload) => void;
  reset: () => void;
}

const initialState = {
  lobby: null,
  draft: null,
  match: null,
  selfUserId: null,
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
      match: {
        matchId: payload.matchId,
        opponent: payload.opponent,
        currentQuestion: null,
        questions: {},
        answerAck: null,
        opponentAnswered: false,
        myTotalPoints: 0,
        oppTotalPoints: 0,
        lastRoundResult: null,
        finalResults: null,
      },
    });
  },
  setMatchQuestion: (payload) => {
    logger.info('Realtime store set match question', { matchId: payload.matchId, qIndex: payload.qIndex });
    set((state) => {
      if (!state.match) return state;
      return {
        ...state,
        match: {
          ...state.match,
          currentQuestion: payload,
          answerAck: null,
          opponentAnswered: false,
          lastRoundResult: null,
          questions: {
            ...state.match.questions,
            [payload.qIndex]: {
              payload,
              correctIndex: state.match.questions[payload.qIndex]?.correctIndex,
            },
          },
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
      const existing = state.match.questions[payload.qIndex];
      const fallbackQuestion = existing?.payload ?? state.match.currentQuestion;
      if (!fallbackQuestion) return state;
      return {
        ...state,
        match: {
          ...state.match,
          answerAck: payload,
          myTotalPoints: payload.myTotalPoints,
          oppTotalPoints: payload.oppTotalPoints,
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
  setOpponentAnswered: () => {
    logger.info('Realtime store set opponent answered');
    set((state) => {
      if (!state.match) return state;
      return {
        ...state,
        match: {
          ...state.match,
          opponentAnswered: true,
        },
      };
    });
  },
  setRoundResult: (payload) => {
    logger.info('Realtime store set round result', { matchId: payload.matchId, qIndex: payload.qIndex });
    set((state) => {
      if (!state.match) return state;
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
      match: state.match
        ? {
            ...state.match,
            finalResults: payload,
          }
        : null,
    }));
  },
  reset: () => {
    logger.info('Realtime store reset');
    set({ ...initialState });
  },
}));
