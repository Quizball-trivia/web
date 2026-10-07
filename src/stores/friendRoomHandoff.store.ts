import { create } from "zustand";
import type { RoomFoundPayload } from "@/lib/realtime/socket.types";

/**
 * The newest `room:found` for a friend room, kept so the room screen can hand off to `/sala/<matchId>`. Written by the
 * global socket listener, so a found that lands before the room screen subscribes is not lost.
 */
export interface FriendRoomHandoff extends RoomFoundPayload {
  receivedAt: number;
  /** Receipt order (a counter, not a clock): "arrived after I asked" never depends on two events' milliseconds. */
  seq: number;
}

let receipts = 0;
/** The receipt counter now: a pointer with a higher `seq` arrived after this call. */
export const roomReceiptMark = () => receipts;

/** Matches already over in this tab: a late or repeated `room:found` for one of them is ignored. */
const ENDED_LIMIT = 20;

interface FriendRoomHandoffState {
  found: FriendRoomHandoff | null;
  /**
   * A live room match this player is not playing in (left it, withdrawn, or left out at the gate): its room shows, not
   * a spinner. Set by the match screen, and by the server on every connect (`room:sitting_out`), so a reload keeps it.
   */
  sittingOut: { matchId: string; lobbyId: string } | null;
  endedIds: string[];
  /** How many "where do I stand" answers (room:active, either way) have arrived: a counter, never a clock. */
  answers: number;
  /** Whether the latest answer pointed at a live seat. */
  lastAnswerLive: boolean;
  /** Database time of the read behind the latest answer (null from older servers). */
  lastAnswerAsOf: number | null;
  answered: (live: boolean, asOf?: number | null) => void;
  /** Identity changed (sign-in / sign-out): nothing about the previous player's room may steer the new one. */
  reset: () => void;
  setFound: (payload: RoomFoundPayload) => void;
  consume: (matchId: string) => void;
  /**
   * A match ended (its id), or the server says this player has no live seat (no id): drop pointers into it. "No live
   * seat" is also true while sitting a match out, so only the end of that match clears `sittingOut`.
   */
  ended: (matchId?: string) => void;
  setSittingOut: (value: { matchId: string; lobbyId: string } | null) => void;
}

const initial = { found: null, sittingOut: null, endedIds: [] as string[], answers: 0, lastAnswerLive: false, lastAnswerAsOf: null };

export const useFriendRoomHandoffStore = create<FriendRoomHandoffState>()((set) => ({
  ...initial,
  answered: (live, asOf = null) => set((state) => ({ answers: state.answers + 1, lastAnswerLive: live, lastAnswerAsOf: asOf })),
  // `answers` keeps counting up: a screen waiting for "an answer after I asked" must not see the counter go back.
  reset: () => set((state) => ({ ...initial, answers: state.answers })),
  setFound: (payload) => set((state) => {
    if (state.endedIds.includes(payload.matchId)) return state;
    const sittingOut = state.sittingOut?.matchId === payload.matchId ? state.sittingOut : null;
    receipts += 1;
    // A confirmation of the same match (room:active) keeps the start time its room:found carried.
    const startedAt = payload.startedAt ?? (state.found?.matchId === payload.matchId ? state.found.startedAt : undefined);
    return { found: { ...payload, startedAt, receivedAt: Date.now(), seq: receipts }, sittingOut };
  }),
  consume: (matchId) => set((state) => (state.found?.matchId === matchId ? { found: null } : state)),
  ended: (matchId) => set((state) => {
    const clearsSittingOut = Boolean(matchId && state.sittingOut?.matchId === matchId);
    return {
      found: !matchId || state.found?.matchId === matchId ? null : state.found,
      sittingOut: clearsSittingOut ? null : state.sittingOut,
      endedIds: matchId && !state.endedIds.includes(matchId) ? [...state.endedIds, matchId].slice(-ENDED_LIMIT) : state.endedIds,
    };
  }),
  setSittingOut: (value) => set((state) => {
    if (value && state.endedIds.includes(value.matchId)) return state;
    if (state.sittingOut?.matchId === value?.matchId) return state;
    return { sittingOut: value };
  }),
}));
