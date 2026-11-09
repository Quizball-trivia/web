import type { RoomClientRules } from "@/features/room/useRoomConnection";
import type { Era, Finish, FormationId, MatchDay, Pick, Variant } from "./draft.rules";
import type { ServerSpin } from "./draft.api";

export type DraftRoomCommand = { type: "pick"; round: number; turn: number; playerId: string; slotId?: string } | { type: "academy"; round: number; turn: number; slotId: string };

export interface DraftRoomView {
  phase: "picking" | "over" | "cancelled"; seats: number; you: number; round: number; turn: number; activeSeat: number | null; deadline: number; status: Array<"in" | "away" | "withdrawn">;
  variant: Variant; era: Era; formation: FormationId; budget: number | null; league: { id: string; name: string; short: string; teams: number; games: number };
  spin: ServerSpin | null; taken: Array<{ playerId: string; seat: number }>; feed: Array<{ seat: number; name: string; club: string; season: string }>; picks: (Pick | null)[][];
  seasons: Array<{ w: number; d: number; l: number; gf: number; ga: number; points: number; position: number; finish: Finish; games: number }> | null; tie: MatchDay | null; winner: number | null; lines: number[] | null;
}

/** One signing per turn, settled once the server has moved past that turn. */
export const draftRoomRules: RoomClientRules<DraftRoomCommand> = {
  slot: (command) => `${command.round}:${command.turn}`,
  settled: (raw, command) => {
    const view = raw as Partial<DraftRoomView>;
    return view.phase !== "picking" || view.round !== command.round || view.turn !== command.turn;
  },
};
