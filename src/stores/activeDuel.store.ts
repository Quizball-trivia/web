import { create } from "zustand";
import type { DuelFoundPayload } from "@/lib/realtime/socket.types";

const KEY = "qb.duel.active";
/** Matches the server's age cap: an older pointer can only be a duel that already ended. */
const MAX_AGE_MS = 3 * 60 * 60 * 1000;

export type ActiveDuel = DuelFoundPayload & { owner: string; seenAt: number };

function read(): ActiveDuel | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ActiveDuel) : null;
  } catch {
    return null;
  }
}

function write(value: ActiveDuel | null): void {
  try {
    if (value) window.localStorage.setItem(KEY, JSON.stringify(value));
    else window.localStorage.removeItem(KEY);
  } catch {
    // storage unavailable (private mode): the in-memory pointer still works for this tab
  }
}

const fresh = (value: ActiveDuel | null, owner: string | null): ActiveDuel | null =>
  value && owner && value.owner === owner && Date.now() - value.seenAt < MAX_AGE_MS ? value : null;

/**
 * The player's live duel, remembered in the browser too (guests have no socket outside game and room pages).
 * Always scoped to its owner: another principal on this browser never sees it. Set by `duel:found`/`duel:active`
 * and by the duel screen; cleared by a finished `duel:state`, by `duel:active` null, and on identity change.
 */
interface ActiveDuelState {
  active: ActiveDuel | null;
  /** The pointer for `owner`, if any and not stale. */
  current: (owner: string | null) => ActiveDuel | null;
  hydrate: (owner: string | null) => void;
  set: (payload: DuelFoundPayload, owner: string | null) => void;
  clear: (matchId?: string) => void;
  /** Identity change: forget the in-memory pointer (the stored one is owner-scoped). */
  reset: () => void;
  /** Whether this browser remembers a recent duel for anyone (so a guest principal is worth resolving). */
  remembers: () => boolean;
}

export const useActiveDuelStore = create<ActiveDuelState>()((set, get) => ({
  active: null,
  current: (owner) => fresh(get().active, owner),
  hydrate: (owner) => {
    const stored = fresh(read(), owner);
    if (!stored && get().active && !fresh(get().active, owner)) set({ active: null });
    if (stored && get().active?.matchId !== stored.matchId) set({ active: stored });
  },
  set: (payload, owner) => {
    if (!owner) return;
    const value: ActiveDuel = { ...payload, owner, seenAt: Date.now() };
    write(value);
    set({ active: value });
  },
  clear: (matchId) => {
    // The stored pointer is cleared even when this tab never loaded it into memory.
    const stored = read();
    if (stored && (!matchId || stored.matchId === matchId)) write(null);
    if (!matchId || get().active?.matchId === matchId) set({ active: null });
  },
  reset: () => set({ active: null }),
  remembers: () => {
    const stored = read();
    return !!stored && Date.now() - stored.seenAt < MAX_AGE_MS;
  },
}));
