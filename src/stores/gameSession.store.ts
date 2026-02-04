import { create } from "zustand";
import type { GameConfig, GameStage, RuntimeAnswer } from "@/types/game.runtime";
import type { GameQuestion } from "@/lib/domain";

type GameSessionState = {
  stage: GameStage;
  config: GameConfig | null;
  questions: GameQuestion[];
  currentIndex: number;
  answers: RuntimeAnswer[];
  startedAt: number | null;
  endedAt: number | null;
  startSession: (config: GameConfig, questions?: GameQuestion[]) => void;
  setQuestions: (questions: GameQuestion[]) => void;
  updateConfig: (config: Partial<GameConfig>) => void;
  setStage: (stage: GameStage) => void;
  submitAnswer: (selectedIndex: number | null, timeMs?: number) => void;
  next: () => void;
  endSession: () => void;
  reset: () => void;
};

const initialState = {
  stage: "idle" as GameStage,
  config: null,
  questions: [] as GameQuestion[],
  currentIndex: 0,
  answers: [] as RuntimeAnswer[],
  startedAt: null as number | null,
  endedAt: null as number | null,
};

export const useGameSessionStore = create<GameSessionState>((set, get) => ({
  ...initialState,
  startSession: (config, questions = []) => {
    const initialStage =
      config.mode === "solo" ? "roundIntro" : "matchmaking";
    set({
      stage: initialStage,
      config,
      questions,
      currentIndex: 0,
      answers: [],
      startedAt: Date.now(),
      endedAt: null,
    });
  },
  setQuestions: (questions) => set({ questions }),
  updateConfig: (partialConfig) =>
    set((state) => ({
      config: state.config ? { ...state.config, ...partialConfig } : null,
    })),
  setStage: (stage) =>
    set((state) => (state.stage === stage ? state : { stage })),
  submitAnswer: (selectedIndex, timeMs) => {
    const { questions, currentIndex, answers } = get();
    const question = questions[currentIndex];
    if (!question) return;
    const isCorrect =
      selectedIndex !== null && selectedIndex === question.correctIndex;
    const nextAnswer: RuntimeAnswer = {
      questionId: question.id,
      selectedIndex,
      isCorrect,
      timeMs,
    };
    set({ answers: [...answers, nextAnswer] });
  },
  next: () => {
    const { currentIndex, questions } = get();
    if (currentIndex < questions.length - 1) {
      set({ currentIndex: currentIndex + 1 });
      return;
    }
    get().endSession();
  },
  endSession: () => {
    set({ stage: "finalResults", endedAt: Date.now() });
  },
  reset: () => set({ ...initialState }),
}));
