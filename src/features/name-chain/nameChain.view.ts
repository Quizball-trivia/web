import type { RoomClientRules } from "@/features/room/useRoomConnection";

export type NameChainVerdict = "ok" | "unknown" | "letter" | "repeat";

/** The server's view of a name-chain room match. The chain and every typed answer are public. */
export interface NameChainView {
  phase: "intro" | "turn" | "roundEnd" | "over";
  round: number;
  maxRounds: number;
  pointsToWin: number;
  format: "duel" | "party";
  turnMs: number;
  /** The letter the next footballer must start with. */
  letter: string;
  /** The seat on turn (null outside a turn). */
  turn: number | null;
  /** Names the turn an answer is for; it changes with every answer taken, lost turn and round. */
  epoch: number;
  attempt: number;
  chain: Array<{ name: string; game: string; by: number | null }>;
  seats: Array<{ seat: number; status: "in" | "away" | "withdrawn"; alive: boolean; score: number; answers: number }>;
  mySeat: number;
  last: { epoch: number; attempt: number; seat: number; kind: NameChainVerdict; text: string; name: string | null; starts: string[] } | null;
  ended: { seat: number; reason: "time" | "pass" | "left" } | null;
  roundWinner: number | null;
  could: string[];
  /** True once the round on screen decided the match. */
  final: boolean;
  standings: Array<{ seat: number; points: number; roundWins: number; place: number }> | null;
  deadline: string | null;
}

export type NameChainCommand = { type: "answer"; epoch: number; attempt: number; text: string } | { type: "pass"; epoch: number };

/** One answer per attempt of a turn (and one give-up per turn), settled once the server has moved past it. */
export const nameChainRoomRules: RoomClientRules<NameChainCommand> = {
  slot: (command) => (command.type === "pass" ? `${command.epoch}:pass` : `${command.epoch}:${command.attempt}`),
  settled: (raw, command) => {
    const view = raw as Partial<NameChainView>;
    return view.phase !== "turn" || view.epoch !== command.epoch || (command.type === "answer" && view.attempt !== command.attempt);
  },
};
