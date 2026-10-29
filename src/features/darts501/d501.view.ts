import type { RoomClientRules } from "@/features/room/useRoomConnection";
import type { DartVerdict } from "./d501.rules";

/** One leg's category: who counts and which number comes off. */
export interface D501Category {
  title: string;
  /** Short unit for the number, e.g. "apps", "goals". */
  unit: string;
  /** "As of" date when active players count. */
  asOf: string | null;
  /** What counts, when the title alone does not say (season cut-off, source). */
  note?: string | null;
  kind?: "player";
  release?: string;
}

/** A thrown (or refused) dart. `name`/`stat` are who the answer was read as and his number (null for a miss). */
export interface Dart {
  id: number;
  by: number;
  text: string;
  name: string | null;
  stat: number | null;
  verdict: DartVerdict;
  before: number;
  after: number;
}

export interface D501SoloState {
  day: string;
  category: D501Category;
  remaining: number;
  /** Thrown darts in order (free answers are not kept). */
  darts: Dart[];
  maxDarts: number;
  status: "playing" | "done";
  endReason: "checkout" | "darts" | "gaveUp" | null;
  /** The latest answer, thrown or free. */
  last: Dart | null;
  ranked: boolean;
  rank?: number;
  /** How many unused answers check out from here (a live hint, as on the TV show); null when none can in one dart. */
  outs?: number | null;
  /** Shown once the run is over: answers that would have checked out from the last score (names once the day is closed). */
  finishes?: Array<{ name: string; stat: number }>;
  /** How many would have; today's names stay hidden. */
  finishesCount?: number | null;
}

export interface D501Seat {
  seat: number;
  status: "in" | "away" | "withdrawn";
  remaining: number;
  dartsUsed: number;
  legsWon: number;
  /** Sum of what is left at the end of each leg (the tie-break: lower is better). */
  leftTotal: number;
  /** Benched for letting three turns in a row run out: throws no more. */
  benched?: boolean;
}

/** The server's view of a room match (1v1 = duel, 3–6 = party). */
export interface D501View {
  phase: "intro" | "turn" | "legEnd" | "over";
  leg: number;
  legs: number;
  format: "duel" | "party";
  turnMs: number;
  maxDarts: number;
  current: D501Category;
  seats: D501Seat[];
  turn: number | null;
  epoch: number;
  attempt: number;
  mySeat: number;
  /** This leg's darts, newest last. */
  darts: Dart[];
  last: Dart | null;
  /** Seats that checked out this round: the rest of the round still throws, and the one closest to 0 takes the leg. */
  finishing: Array<{ seat: number; at: number }>;
  /** Unused answers that check out for the seat throwing now. */
  outs?: number | null;
  /** `missed`: what would have checked out from the viewer's own score. */
  legEnd: { winner: number | null; reason: "checkout" | "darts" | "out"; missed?: Array<{ name: string; value: number }> } | null;
  final: boolean;
  standings: Array<{ seat: number; points: number; roundWins: number; place: number }> | null;
  deadline: string | null;
}

export type D501Command = { type: "throw"; epoch: number; attempt: number; text: string; pick?: string | null };

/** One dart per attempt of a turn, settled once the server has moved past it. */
export const d501RoomRules: RoomClientRules<D501Command> = {
  slot: (command) => `${command.epoch}:${command.attempt}`,
  settled: (raw, command) => {
    const view = raw as Partial<D501View>;
    return view.phase !== "turn" || view.epoch !== command.epoch || view.attempt !== command.attempt;
  },
};

export const dartsThrown = (darts: readonly Dart[], seat?: number) => darts.filter((d) => (seat === undefined || d.by === seat) && d.verdict !== "repeat" && d.verdict !== "unknown" && d.verdict !== "uncovered" && d.verdict !== "ambiguous").length;
