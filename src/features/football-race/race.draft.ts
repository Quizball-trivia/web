import { rng } from "./race.rules";

/**
 * Choosing nations: the server deals a balanced set (one nation per seat), then the seats take turns picking from it in
 * a random order. The last seat gets the nation left over. A seat that lets its clock run out is given a random one.
 */
export interface DraftState {
  /** Seats in picking order. */
  order: number[];
  /** Nation id per seat, once picked. */
  picks: Array<string | null>;
  auto: boolean[];
  turn: number;
  deadline: number;
  done: boolean;
}

export type DraftError = "over" | "not_your_turn" | "taken" | "unknown";

export function startDraft(seats: number, seed: number, now: number, pickMs: number): DraftState {
  const random = rng(seed + 401);
  const order = Array.from({ length: seats }, (_, seat) => ({ seat, k: random() })).sort((a, b) => a.k - b.k).map((x) => x.seat);
  return { order, picks: order.map(() => null), auto: order.map(() => false), turn: 0, deadline: now + pickMs, done: false };
}

const advance = (state: DraftState, nations: string[], now: number, pickMs: number): DraftState => {
  const turn = state.turn + 1;
  if (turn < state.order.length - 1) return { ...state, turn, deadline: now + pickMs };
  // The last seat has one nation left: it is theirs, no clock.
  const left = nations.find((n) => !state.picks.includes(n))!;
  const last = state.order[state.order.length - 1];
  return { ...state, turn: state.order.length, picks: state.picks.map((p, s) => (s === last ? left : p)), done: true, deadline: now };
};

export function draftPick(state: DraftState, nations: string[], seat: number, nation: string, now: number, pickMs: number): { state: DraftState; error?: DraftError } {
  if (state.done) return { state, error: "over" };
  if (state.order[state.turn] !== seat) return { state, error: "not_your_turn" };
  if (!nations.includes(nation)) return { state, error: "unknown" };
  if (state.picks.includes(nation)) return { state, error: "taken" };
  const picks = state.picks.map((p, s) => (s === seat ? nation : p));
  return { state: advance({ ...state, picks }, nations, now, pickMs) };
}

/** The clock ran out for the seat on turn: a random nation still free. */
export function draftTick(state: DraftState, nations: string[], seed: number, now: number, pickMs: number): DraftState {
  if (state.done || now < state.deadline) return state;
  const seat = state.order[state.turn];
  const free = nations.filter((n) => !state.picks.includes(n));
  const nation = free[Math.floor(rng(seed + state.turn * 31)() * free.length)];
  const picks = state.picks.map((p, s) => (s === seat ? nation : p));
  return advance({ ...state, picks, auto: state.auto.map((a, s) => (s === seat ? true : a)) }, nations, now, pickMs);
}
