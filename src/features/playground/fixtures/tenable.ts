import { randomBotAvatar } from "@/features/auction/data/botAvatars";
import { emptySlots, type TenableSlot, type TenableSoloState, type TenableView } from "@/features/tenable/tenable.view";
import type { RoomStatePayload } from "@/lib/realtime/socket.types";
import { PLAYERS } from "./universe";

/** An invented list on the invented universe: never a real answer here (the repository is public). */
export const FIXTURE_LIST = { title: "Top 10 all-time Liga Aurora scorers", asOf: "1 Oct 2026" };
const ENTRIES = PLAYERS.slice(0, 10).map((name, i) => ({ rank: i + 1, name, detail: `${180 - i * 11} goals` }));

/** Slots with these ranks found (by seat), the rest hidden; `reveal` shows the rest as missed. */
export function slotsWith(found: Record<number, number>, reveal = false): TenableSlot[] {
  return emptySlots().map((s) => {
    const e = ENTRIES[s.rank - 1];
    if (found[s.rank] !== undefined) return { ...s, name: e.name, detail: e.detail, by: found[s.rank] };
    return reveal ? { ...s, name: e.name, detail: e.detail, missed: true } : s;
  });
}

export function soloState(o: Partial<TenableSoloState> & { found?: number[] } = {}): TenableSoloState {
  const { found = [], ...rest } = o;
  return {
    day: "2026-10-22", list: FIXTURE_LIST, slots: slotsWith(Object.fromEntries(found.map((r) => [r, 0]))), lives: 3, maxLives: 3, misses: [],
    status: "playing", endReason: null, last: null, ranked: true, ...rest,
  };
}

export const SEAT_NAMES = ["Vos", "Rival Inventado 4821", "Lola Brisa", "Kevo_09", "Tano Nube", "Mar Aurora"];

export function roomSnapshot(n: number, view: TenableView, statuses: Record<number, "away" | "withdrawn"> = {}): RoomStatePayload {
  return {
    matchId: "playground", lobbyId: null, game: "name_chain", stateVersion: 1, status: view.phase === "over" ? "completed" : "active", phaseToken: 1,
    phaseDeadlineAt: view.deadline, serverNow: new Date().toISOString(),
    me: { userId: "pg-0", admitted: true, active: true, seat: 0, slot: 0, ready: true },
    seats: Array.from({ length: n }, (_, seat) => ({
      seat, slot: seat, userId: `pg-${seat}`, username: SEAT_NAMES[seat], avatarUrl: null, avatarCustomization: randomBotAvatar(`pg-${seat}`),
      isGuest: false, ready: true, connected: statuses[seat] !== "away", admitted: true, active: statuses[seat] !== "withdrawn",
    })) as RoomStatePayload["seats"],
    view, result: null,
  };
}

/** A room view mid-list; seats default to full lives. */
export function roomView(n: number, o: Partial<TenableView> = {}): TenableView {
  return {
    phase: "turn", list: 1, lists: 3, format: n === 2 ? "duel" : "party", turnMs: 20_000, current: FIXTURE_LIST,
    slots: slotsWith(n === 2 ? { 1: 0, 4: 1, 7: 0 } : { 1: 0, 2: 1, 4: 2, 7: 3 }), turn: 0, epoch: 9, attempt: 0, maxLives: 2,
    seats: Array.from({ length: n }, (_, seat) => ({ seat, status: "in" as const, lives: 2, score: [17, 12, 9, 6, 4, 3][seat], found: [3, 2, 2, 1, 1, 1][seat] })),
    mySeat: 0, last: null, listEnd: null, listPoints: null, final: false, standings: null, deadline: new Date(Date.now() + 12_000).toISOString(), ...o,
  };
}
