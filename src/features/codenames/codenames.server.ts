import { seatAvatar } from "@/features/duel/DuelAvatar";
import type { RoomClientRules } from "@/features/room/useRoomConnection";
import type { RoomStatePayload } from "@/lib/realtime/socket.types";
import type { CardKey, CodenamesCommand, CodenamesRoomView, RoomPlayer, Team } from "./codenames.view";

/** The room view the server sends (backend codenames.engine viewOf). */
export interface CodenamesServerView {
  phase: "teams" | "clue" | "guess" | "over";
  cancelled: boolean;
  cancelReason: "idle" | "players" | null;
  mySeat: number;
  host: number;
  players: Array<{ seat: number; status: RoomPlayer["status"]; team: Team | null; scout: boolean; sawKey: boolean }>;
  botScout: [boolean, boolean];
  starting: Team;
  turn: Team;
  turnNo: number;
  /** Team shuffles so far. */
  shuffles: number;
  cards: Array<{ id: string; revealed: CardKey | null; key: CardKey | null; picks: number[] }>;
  clue: { word: string; count: number; bot: boolean } | null;
  guessesLeft: number | null;
  history: Array<{ team: Team; clue: { word: string; count: number; bot: boolean } | null; flips: Array<{ card: number; key: CardKey; seat: number }> }>;
  used: string[];
  result: { winner: Team; reason: "cleared" | "owngoal" | "left" } | null;
}

/** What the server takes (backend codenamesCommandSchema): cards by board position, play commands for one turn. */
export type CodenamesServerCommand =
  | { type: "join"; team: Team; scout: boolean }
  | { type: "shuffle"; seen?: number }
  | { type: "kickoff" }
  | { type: "clue"; turn: number; word: string; count: number }
  | { type: "point"; turn: number; card: number | null; n?: number }
  | { type: "flip"; turn: number; card: number }
  | { type: "endTurn"; turn: number };

/**
 * The screens' command (cards by id) for the turn on screen. Null when the card is not on the board.
 */
/** Every pointer tap gets its own number: pointing back at a card is a new command, never a repeat of the first one. */
let pointer = 0;
/** The side and role this tab asked for last: an earlier ask is superseded (settled), never resent over it. */
let latestJoin: string | null = null;

export function toServerCommand(command: CodenamesCommand, view: CodenamesServerView): CodenamesServerCommand | null {
  const at = (id: string | null) => (id === null ? null : view.cards.findIndex((c) => c.id === id));
  switch (command.type) {
    case "join":
      latestJoin = `${command.team}:${command.scout}`;
      return command;
    case "kickoff":
      return command;
    case "shuffle":
      return { type: "shuffle", seen: view.shuffles };
    case "clue":
      return { type: "clue", turn: view.turnNo, word: command.word, count: command.count };
    case "pick": {
      const card = at(command.cardId);
      pointer = (pointer + 1) % 100_000;
      return card === -1 ? null : { type: "point", turn: view.turnNo, card, n: pointer };
    }
    case "flip": {
      const card = at(command.cardId);
      return card === null || card === -1 ? null : { type: "flip", turn: view.turnNo, card };
    }
    case "endTurn":
      return { type: "endTurn", turn: view.turnNo };
  }
}

/**
 * When a command's outcome is on screen: a side or role once the seat shows it, a turn's command once the turn moved
 * on or shows it, a shuffle once the shuffle count passes what the sender saw. A pointer (a hint to teammates, replaced
 * by the next tap, so waiting for it could hold the board) settles with any newer state.
 */
export const codenamesRoomRules: RoomClientRules<CodenamesServerCommand> = {
  slot: (c) => {
    switch (c.type) {
      case "join": return `join:${c.team}:${c.scout}`;
      case "shuffle":
      case "kickoff": return c.type;
      case "clue": return `c:${c.turn}`;
      case "point": return `p:${c.turn}:${c.n ?? c.card}`;
      case "flip": return `f:${c.turn}:${c.card}`;
      case "endTurn": return `e:${c.turn}`;
    }
  },
  settled: (raw, c) => {
    const v = raw as Partial<CodenamesServerView>;
    const me = v.players?.find((p) => p.seat === v.mySeat);
    if (c.type === "point") return true;
    if (c.type === "shuffle") return v.phase !== "teams" || (v.shuffles ?? 0) > (c.seen ?? -1);
    if (c.type === "join") return v.phase !== "teams" || (latestJoin !== null && `${c.team}:${c.scout}` !== latestJoin) || (me?.team === c.team && me.scout === c.scout);
    if (c.type === "kickoff") return v.phase !== "teams";
    if (v.turnNo !== c.turn) return true;
    if (c.type === "clue") return v.phase !== "clue";
    if (c.type === "flip") return v.cards?.[c.card]?.revealed != null;
    return false;
  },
};

/** The server view in the screens' shape, with each seat's name and face from the room's seat rows. */
export function toRoomView(v: CodenamesServerView, snapshot: RoomStatePayload): CodenamesRoomView {
  const bySeat = new Map(snapshot.seats.filter((s) => s.seat !== null).map((s) => [s.seat!, s]));
  return {
    phase: v.phase,
    mySeat: v.mySeat,
    host: v.host,
    turnNo: v.turnNo,
    botScout: v.botScout,
    used: v.used,
    players: v.players.map((p) => {
      const who = bySeat.get(p.seat);
      return {
        seat: p.seat, team: p.team, scout: p.scout, sawKey: p.sawKey, status: p.status, name: who?.username ?? "—",
        avatar: seatAvatar(who ?? { userId: String(p.seat), avatarCustomization: null, avatarUrl: null, isGuest: true }),
      };
    }),
    starting: v.starting,
    turn: v.turn,
    cards: v.cards.map((c) => ({ id: c.id, key: c.key, revealed: c.revealed, picks: c.picks })),
    clue: v.clue,
    guessesLeft: v.guessesLeft,
    history: v.history.map((t) => ({ team: t.team, clue: t.clue, flips: t.flips.map((f) => f.key) })),
    result: v.result,
  };
}
