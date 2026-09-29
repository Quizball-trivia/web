import { create } from "zustand";
import type { DuelFoundPayload } from "@/lib/realtime/socket.types";

/**
 * The newest `duel:found` for a friend room, kept only so the room screen can hand off to
 * `/duelo/<matchId>` (the duel screen owns everything else). Written by the global socket
 * listener, so a found that lands before the room screen subscribes is not lost.
 */
export interface FriendDuelHandoff extends DuelFoundPayload {
  receivedAt: number;
}

interface FriendDuelHandoffState {
  found: FriendDuelHandoff | null;
  setFound: (payload: DuelFoundPayload) => void;
  /** Drops the handoff for this match only (a newer one may already have replaced it). */
  consume: (matchId: string) => void;
}

export const useFriendDuelHandoffStore = create<FriendDuelHandoffState>()((set) => ({
  found: null,
  setFound: (payload) => set({ found: { ...payload, receivedAt: Date.now() } }),
  consume: (matchId) => set((state) => (state.found?.matchId === matchId ? { found: null } : state)),
}));
