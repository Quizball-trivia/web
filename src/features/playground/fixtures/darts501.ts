import { randomBotAvatar } from "@/features/auction/data/botAvatars";
import { D501, judgeDart } from "@/features/darts501/d501.rules";
import type { D501Category, D501SoloState, D501View, Dart } from "@/features/darts501/d501.view";
import type { RoomStatePayload } from "@/lib/realtime/socket.types";
import { PLAYERS } from "./universe";

/** An invented category on the invented universe: never a real answer here (the repository is public). */
export const FIXTURE_CATEGORY: D501Category = { title: "Liga Aurora appearances for Atlético Aurora", unit: "apps", asOf: "1 Nov 2026", kind: "player", release: "fixture" };

/** Darts thrown in order by the given seats: [name index, number] (null number = not in the category). */
export function throws(list: Array<[number, number | null, number?]>, starts: Record<number, number> = {}): Dart[] {
  const left: Record<number, number> = { ...starts };
  return list.map(([i, stat, by = 0], k) => {
    const before = left[by] ?? D501.start;
    const { verdict, after } = judgeDart(before, stat);
    left[by] = after;
    return { id: 100 + k, by, text: PLAYERS[i], name: PLAYERS[i], stat, verdict, before, after };
  });
}

const remainingOf = (darts: readonly Dart[], seat = 0) => [...darts].reverse().find((d) => d.by === seat)?.after ?? D501.start;

export function soloState(darts: Dart[], o: Partial<D501SoloState> = {}): D501SoloState {
  return {
    day: "2026-11-01", category: FIXTURE_CATEGORY, remaining: remainingOf(darts), darts, maxDarts: D501.soloDarts, status: "playing", endReason: null,
    last: darts.at(-1) ?? null, ranked: true, ...o,
  };
}

export const SEAT_NAMES = ["Vos", "Rival Inventado 4821", "Lola Brisa", "Kevo_09", "Tano Nube", "Mar Aurora"];

export function d501Snapshot(n: number, view: D501View): RoomStatePayload {
  return {
    matchId: "playground", lobbyId: null, game: "name_chain", stateVersion: 1, status: view.phase === "over" ? "completed" : "active", phaseToken: 1,
    phaseDeadlineAt: view.deadline, serverNow: new Date().toISOString(),
    me: { userId: "pg-0", admitted: true, active: true, seat: 0, slot: 0, ready: true },
    seats: Array.from({ length: n }, (_, seat) => ({
      seat, slot: seat, userId: `pg-${seat}`, username: SEAT_NAMES[seat], avatarUrl: null, avatarCustomization: randomBotAvatar(`pg-${seat}`),
      isGuest: false, ready: true, connected: true, admitted: true, active: true,
    })) as RoomStatePayload["seats"],
    view, result: null,
  };
}

/** A room view mid-leg: darts by seat as [name index, number, seat]. */
export function roomView(n: number, darts: Dart[], o: Partial<D501View> = {}): D501View {
  return {
    phase: "turn", leg: 1, legs: D501.legs, format: n === 2 ? "duel" : "party", turnMs: D501.turnMs, maxDarts: D501.roomDarts, current: FIXTURE_CATEGORY,
    seats: Array.from({ length: n }, (_, seat) => ({ seat, status: "in" as const, remaining: remainingOf(darts, seat), dartsUsed: darts.filter((d) => d.by === seat).length, legsWon: seat === 1 ? 1 : 0, leftTotal: [0, 0, 120, 210, 260, 301][seat] })),
    turn: 0, epoch: 9, attempt: 0, mySeat: 0, darts, last: darts.at(-1) ?? null, finishing: [], outs: 4, legEnd: null, final: false, standings: null,
    deadline: new Date(Date.now() + 12_000).toISOString(), ...o,
  };
}
