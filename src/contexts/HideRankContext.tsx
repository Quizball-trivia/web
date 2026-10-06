"use client";

import { createContext, useContext, type ReactNode } from "react";

/** Partner views (Freecroco) play ranked without Quizball RP or tiers: match screens hide those labels. */
const HideRankContext = createContext(false);

export function HideRankProvider({ children }: { children: ReactNode }) {
  return <HideRankContext.Provider value>{children}</HideRankContext.Provider>;
}

export function useHideRank(): boolean {
  return useContext(HideRankContext);
}
