"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { PlayOrder } from "./playCatalog";

const NO_ORDER: PlayOrder = { daily: null, coins: null, newSlugs: [] };
const PlayOrderContext = createContext<PlayOrder>(NO_ORDER);

/** Hands the server's order and new marks to the Play page's game rows. */
export function PlayOrderProvider({ value, children }: { value: PlayOrder; children: ReactNode }) {
  return <PlayOrderContext.Provider value={value}>{children}</PlayOrderContext.Provider>;
}

export const usePlayOrder = (): PlayOrder => useContext(PlayOrderContext);
