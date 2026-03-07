import { create } from "zustand";
import type { GameConfig, GameStage } from "@/types/game.runtime";
import type { GameQuestion } from "@/lib/domain";

type GameSessionState = {
  stage: GameStage;
  config: GameConfig | null;
  questions: GameQuestion[];
  startSession: (config: GameConfig, questions?: GameQuestion[]) => void;
  setStage: (stage: GameStage) => void;
  reset: () => void;
};

const initialState = {
  stage: "idle" as GameStage,
  config: null,
  questions: [] as GameQuestion[],
};

export const useGameSessionStore = create<GameSessionState>((set) => ({
  ...initialState,
  startSession: (config, questions = []) => {
    const initialStage =
      config.mode === "solo" ? "roundIntro" : "matchmaking";
    set({
      stage: initialStage,
      config,
      questions,
    });
  },
  setStage: (stage) =>
    set((state) => (state.stage === stage ? state : { stage })),
  reset: () => set({ ...initialState }),
}));
