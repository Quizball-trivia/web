import { create } from 'zustand';
import type { GameQuestion } from '@/lib/domain/gameQuestion';
import type {
  Phase,
  PossessionState,
  AnswerStateArray,
  ShotResult,
  FeedDirection,
  PenaltyResult,
  PenaltyFieldPhase,
  TacticalCard,
} from '@/features/possession/types/possession.types';
import {
  DEFAULT_ANSWER_STATES,
  INITIAL_POSSESSION,
} from '@/features/possession/types/possession.types';

// ─── Store shape ────────────────────────────────────────────────
interface PossessionMatchState {
  // Match
  phase: Phase;
  half: 1 | 2;
  normalQuestionsInHalf: number;
  tactic: TacticalCard | null;

  // Possession
  player: PossessionState;
  opponent: PossessionState;

  // Question
  currentQuestion: GameQuestion | null;
  selectedAnswer: number | null;
  opponentAnswer: number | null;
  opponentTime: number;
  playerTime: number;
  timeRemaining: number;
  answerStates: AnswerStateArray;
  showOptions: boolean;

  // Shot
  shotQuestion: GameQuestion | null;
  shotSelectedAnswer: number | null;
  shotAnswerStates: AnswerStateArray;
  shotResult: ShotResult;
  shotOpponentAnswer: number | null;
  shotOpponentTime: number;
  shotPlayerTime: number;

  // Feed
  feedMessage: string | null;
  feedDirection: FeedDirection;

  // Score splashes
  showPlayerSplash: boolean;
  showOpponentSplash: boolean;
  playerSplashPoints: number;
  opponentSplashPoints: number;

  // Stats
  totalCorrect: number;
  totalQuestions: number;
  totalShots: number;
  positionSum: number;
  positionSamples: number;

  // Sound
  muted: boolean;

  // Penalty
  penaltyRound: number;
  penaltyPlayerScore: number;
  penaltyOpponentScore: number;
  isPenaltySuddenDeath: boolean;
  isPlayerShooter: boolean;
  penaltyQuestion: GameQuestion | null;
  penaltyPlayerAnswer: number | null;
  penaltyOpponentAnswer: number | null;
  penaltyPlayerTime: number;
  penaltyOpponentTime: number;
  penaltyAnswerStates: AnswerStateArray;
  penaltyResult: PenaltyResult;
  penaltyShowOptions: boolean;
  penaltyFieldPhase: PenaltyFieldPhase;
}

// ─── Actions ────────────────────────────────────────────────────
interface PossessionMatchActions {
  setPhase: (phase: Phase) => void;
  setHalf: (half: 1 | 2) => void;
  setNormalQuestionsInHalf: (n: number | ((prev: number) => number)) => void;
  setTactic: (tactic: TacticalCard | null) => void;

  setPlayer: (fn: (p: PossessionState) => PossessionState) => void;
  setOpponent: (fn: (o: PossessionState) => PossessionState) => void;

  setCurrentQuestion: (q: GameQuestion | null) => void;
  setSelectedAnswer: (a: number | null) => void;
  setOpponentAnswer: (a: number | null) => void;
  setOpponentTime: (t: number) => void;
  setPlayerTime: (t: number) => void;
  setTimeRemaining: (t: number | ((prev: number) => number)) => void;
  setAnswerStates: (s: AnswerStateArray) => void;
  setShowOptions: (v: boolean) => void;

  setShotQuestion: (q: GameQuestion | null) => void;
  setShotSelectedAnswer: (a: number | null) => void;
  setShotAnswerStates: (s: AnswerStateArray) => void;
  setShotResult: (r: ShotResult) => void;
  setShotOpponentAnswer: (a: number | null) => void;
  setShotOpponentTime: (t: number) => void;
  setShotPlayerTime: (t: number) => void;

  setFeedMessage: (m: string | null) => void;
  setFeedDirection: (d: FeedDirection) => void;

  setShowPlayerSplash: (v: boolean) => void;
  setShowOpponentSplash: (v: boolean) => void;
  setPlayerSplashPoints: (p: number) => void;
  setOpponentSplashPoints: (p: number) => void;

  incrementTotalCorrect: () => void;
  incrementTotalQuestions: () => void;
  incrementTotalShots: () => void;
  addPositionSample: (position: number) => void;

  setMuted: (v: boolean) => void;

  setPenaltyRound: (n: number | ((prev: number) => number)) => void;
  setPenaltyPlayerScore: (n: number | ((prev: number) => number)) => void;
  setPenaltyOpponentScore: (n: number | ((prev: number) => number)) => void;
  setIsPenaltySuddenDeath: (v: boolean) => void;
  setIsPlayerShooter: (v: boolean | ((prev: boolean) => boolean)) => void;
  setPenaltyQuestion: (q: GameQuestion | null) => void;
  setPenaltyPlayerAnswer: (a: number | null) => void;
  setPenaltyOpponentAnswer: (a: number | null) => void;
  setPenaltyPlayerTime: (t: number) => void;
  setPenaltyOpponentTime: (t: number) => void;
  setPenaltyAnswerStates: (s: AnswerStateArray) => void;
  setPenaltyResult: (r: PenaltyResult) => void;
  setPenaltyShowOptions: (v: boolean) => void;
  setPenaltyFieldPhase: (p: PenaltyFieldPhase) => void;

  resetQuestionState: () => void;
  resetMatch: () => void;
}

export type PossessionMatchStore = PossessionMatchState & PossessionMatchActions;

// ─── Initial state ──────────────────────────────────────────────
const initialState: PossessionMatchState = {
  phase: 'intro',
  half: 1,
  normalQuestionsInHalf: 0,
  tactic: null,

  player: { ...INITIAL_POSSESSION },
  opponent: { ...INITIAL_POSSESSION },

  currentQuestion: null,
  selectedAnswer: null,
  opponentAnswer: null,
  opponentTime: 0,
  playerTime: 0,
  timeRemaining: 0,
  answerStates: [...DEFAULT_ANSWER_STATES],
  showOptions: false,

  shotQuestion: null,
  shotSelectedAnswer: null,
  shotAnswerStates: [...DEFAULT_ANSWER_STATES],
  shotResult: 'pending',
  shotOpponentAnswer: null,
  shotOpponentTime: 0,
  shotPlayerTime: 0,

  feedMessage: null,
  feedDirection: 'neutral',

  showPlayerSplash: false,
  showOpponentSplash: false,
  playerSplashPoints: 0,
  opponentSplashPoints: 0,

  totalCorrect: 0,
  totalQuestions: 0,
  totalShots: 0,
  positionSum: 0,
  positionSamples: 0,

  muted: false,

  penaltyRound: 1,
  penaltyPlayerScore: 0,
  penaltyOpponentScore: 0,
  isPenaltySuddenDeath: false,
  isPlayerShooter: true,
  penaltyQuestion: null,
  penaltyPlayerAnswer: null,
  penaltyOpponentAnswer: null,
  penaltyPlayerTime: 0,
  penaltyOpponentTime: 0,
  penaltyAnswerStates: [...DEFAULT_ANSWER_STATES],
  penaltyResult: null,
  penaltyShowOptions: false,
  penaltyFieldPhase: 'setup',
};

// ─── Store ──────────────────────────────────────────────────────
export const usePossessionMatchStore = create<PossessionMatchStore>((set) => ({
  ...initialState,

  setPhase: (phase) => set({ phase }),
  setHalf: (half) => set({ half }),
  setNormalQuestionsInHalf: (n) =>
    set((s) => ({ normalQuestionsInHalf: typeof n === 'function' ? n(s.normalQuestionsInHalf) : n })),
  setTactic: (tactic) => set({ tactic }),

  setPlayer: (fn) => set((s) => ({ player: fn(s.player) })),
  setOpponent: (fn) => set((s) => ({ opponent: fn(s.opponent) })),

  setCurrentQuestion: (q) => set({ currentQuestion: q }),
  setSelectedAnswer: (a) => set({ selectedAnswer: a }),
  setOpponentAnswer: (a) => set({ opponentAnswer: a }),
  setOpponentTime: (t) => set({ opponentTime: t }),
  setPlayerTime: (t) => set({ playerTime: t }),
  setTimeRemaining: (t) =>
    set((s) => ({ timeRemaining: typeof t === 'function' ? t(s.timeRemaining) : t })),
  setAnswerStates: (s) => set({ answerStates: s }),
  setShowOptions: (v) => set({ showOptions: v }),

  setShotQuestion: (q) => set({ shotQuestion: q }),
  setShotSelectedAnswer: (a) => set({ shotSelectedAnswer: a }),
  setShotAnswerStates: (s) => set({ shotAnswerStates: s }),
  setShotResult: (r) => set({ shotResult: r }),
  setShotOpponentAnswer: (a) => set({ shotOpponentAnswer: a }),
  setShotOpponentTime: (t) => set({ shotOpponentTime: t }),
  setShotPlayerTime: (t) => set({ shotPlayerTime: t }),

  setFeedMessage: (m) => set({ feedMessage: m }),
  setFeedDirection: (d) => set({ feedDirection: d }),

  setShowPlayerSplash: (v) => set({ showPlayerSplash: v }),
  setShowOpponentSplash: (v) => set({ showOpponentSplash: v }),
  setPlayerSplashPoints: (p) => set({ playerSplashPoints: p }),
  setOpponentSplashPoints: (p) => set({ opponentSplashPoints: p }),

  incrementTotalCorrect: () => set((s) => ({ totalCorrect: s.totalCorrect + 1 })),
  incrementTotalQuestions: () => set((s) => ({ totalQuestions: s.totalQuestions + 1 })),
  incrementTotalShots: () => set((s) => ({ totalShots: s.totalShots + 1 })),
  addPositionSample: (position) =>
    set((s) => ({ positionSum: s.positionSum + position, positionSamples: s.positionSamples + 1 })),

  setMuted: (v) => set({ muted: v }),

  setPenaltyRound: (n) =>
    set((s) => ({ penaltyRound: typeof n === 'function' ? n(s.penaltyRound) : n })),
  setPenaltyPlayerScore: (n) =>
    set((s) => ({ penaltyPlayerScore: typeof n === 'function' ? n(s.penaltyPlayerScore) : n })),
  setPenaltyOpponentScore: (n) =>
    set((s) => ({ penaltyOpponentScore: typeof n === 'function' ? n(s.penaltyOpponentScore) : n })),
  setIsPenaltySuddenDeath: (v) => set({ isPenaltySuddenDeath: v }),
  setIsPlayerShooter: (v) =>
    set((s) => ({ isPlayerShooter: typeof v === 'function' ? v(s.isPlayerShooter) : v })),
  setPenaltyQuestion: (q) => set({ penaltyQuestion: q }),
  setPenaltyPlayerAnswer: (a) => set({ penaltyPlayerAnswer: a }),
  setPenaltyOpponentAnswer: (a) => set({ penaltyOpponentAnswer: a }),
  setPenaltyPlayerTime: (t) => set({ penaltyPlayerTime: t }),
  setPenaltyOpponentTime: (t) => set({ penaltyOpponentTime: t }),
  setPenaltyAnswerStates: (s) => set({ penaltyAnswerStates: s }),
  setPenaltyResult: (r) => set({ penaltyResult: r }),
  setPenaltyShowOptions: (v) => set({ penaltyShowOptions: v }),
  setPenaltyFieldPhase: (p) => set({ penaltyFieldPhase: p }),

  resetQuestionState: () =>
    set({
      selectedAnswer: null,
      opponentAnswer: null,
      answerStates: [...DEFAULT_ANSWER_STATES],
      showOptions: false,
      playerTime: 0,
      opponentTime: 0,
      timeRemaining: 0,
      showPlayerSplash: false,
      showOpponentSplash: false,
    }),

  resetMatch: () => set({ ...initialState }),
}));
