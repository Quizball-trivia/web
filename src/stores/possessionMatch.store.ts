import { create } from 'zustand';

interface PossessionMatchState {
  totalCorrect: number;
  totalQuestions: number;
}

interface PossessionMatchActions {
  incrementTotalCorrect: () => void;
  incrementTotalQuestions: () => void;
  resetMatch: () => void;
}

export type PossessionMatchStore = PossessionMatchState & PossessionMatchActions;

export const usePossessionMatchStore = create<PossessionMatchStore>((set) => ({
  totalCorrect: 0,
  totalQuestions: 0,

  incrementTotalCorrect: () => set((s) => ({ totalCorrect: s.totalCorrect + 1 })),
  incrementTotalQuestions: () => set((s) => ({ totalQuestions: s.totalQuestions + 1 })),
  resetMatch: () => set({ totalCorrect: 0, totalQuestions: 0 }),
}));
