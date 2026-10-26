import type { RoomClientRules } from "@/features/room/useRoomConnection";
import { DUEL_MISSES, type CxBoard, type CxDuelState, type CxLast, type CxSeat, type CxSolved, type CxTier, type CxVerdict } from "./conexiones.logic";

/** The room view the server sends (backend conexiones.engine viewOf), already in the reader's language. */
export interface ConexionesServerView {
  phase: "intro" | "turn" | "name" | "reveal" | "over";
  board: number;
  totalBoards: number;
  n: number;
  turn: number;
  mySeat: number;
  tiles: Array<{ id: string; name: string; portrait: string | null }>;
  out: Array<{ id: string; tier: CxTier; link: string; note: string | null; members: string[]; by: number | null }>;
  tries: Array<{ seat: number; ids: string[] | null; verdict: CxVerdict | "timeout" }>;
  missesLeft: number;
  options: string[] | null;
  named: { seat: number; pick: number | null; right: boolean; answer: number } | null;
  scores: number[];
  points: number[][];
  seats: Array<{ seat: number; status: "in" | "away" | "withdrawn"; timeouts: number }>;
  result: { winner: number | null; reason: "score" | "forfeit" | "left" } | null;
  standings: Array<{ seat: number; points: number; roundWins: number; place: number }> | null;
  deadline: string | null;
}

export type CxCommand = { type: "try"; board: number; n: number; ids: string[] } | { type: "name"; board: number; n: number; pick: number };

/** One move per turn: settled once the board or the move number moved on (a refused move is released by its result). */
export const conexionesRoomRules: RoomClientRules<CxCommand> = {
  slot: (c) => `${c.board}:${c.n}`,
  settled: (raw, c) => {
    const v = raw as Partial<ConexionesServerView>;
    return v.board !== c.board || v.n !== c.n || (v.phase !== "turn" && v.phase !== "name");
  },
};

const seat = (n: number): CxSeat => (n === 1 ? 1 : 0);
const text = (s: string) => ({ en: s });

/** What the last move was, for the status line: the naming in a reveal after it, else the last try. */
function lastOf(v: ConexionesServerView): CxLast | null {
  if (v.named && (v.phase === "reveal" || v.phase === "over")) {
    const group = v.out[v.out.length - 1];
    if (v.named.pick === null) return { seat: seat(v.named.seat), kind: "timeout", groupId: group?.id };
    return { seat: seat(v.named.seat), kind: v.named.right ? "named" : "misnamed", groupId: group?.id, pick: v.options?.[v.named.pick] };
  }
  const t = v.tries[v.tries.length - 1];
  if (!t) return null;
  const hit = t.verdict === "right" && t.ids ? v.out.find((g) => g.members.every((id) => t.ids!.includes(id))) : undefined;
  return { seat: seat(t.seat), kind: t.verdict, ids: t.ids ?? undefined, groupId: hit?.id };
}

/**
 * The server view in the duel screens' shape. Only this board's tiles and the groups already out are known: the
 * screens never get a group that is still in play.
 */
export function toDuelState(v: ConexionesServerView): CxDuelState {
  const groups = v.out.map((g) => ({ id: g.id, tier: g.tier, link: text(g.link), note: g.note, members: g.members, decoys: [] }));
  const current: CxBoard = { id: `b${v.board}`, tiles: v.tiles.map((t) => ({ id: t.id, name: t.name, portrait: t.portrait })), groups };
  const boards = Array.from({ length: v.totalBoards }, (_, i): CxBoard => (i === v.board ? current : { id: `b${i}`, tiles: [], groups: [] }));
  const outIds = new Set(v.out.flatMap((g) => g.members));
  const solved: CxSolved[] = v.out.map((g) => ({ groupId: g.id, tier: g.tier, link: text(g.link), note: g.note, members: g.members, by: g.by, missed: g.by === null }));
  const phase = v.phase === "intro" ? "reveal" : v.phase;
  return {
    boards,
    index: v.board,
    firstStarter: 0,
    turn: seat(v.turn),
    scores: [v.scores[0] ?? 0, v.scores[1] ?? 0],
    order: v.tiles.map((t) => t.id).filter((id) => !outIds.has(id)),
    solved,
    misses: DUEL_MISSES - v.missesLeft,
    tries: v.tries.map((t) => ({ seat: seat(t.seat), ids: t.ids ?? [], verdict: t.verdict })),
    phase,
    nameOptions: v.options ? v.options.map(text) : null,
    namePick: v.named?.pick != null && v.options ? v.options[v.named.pick] : null,
    last: lastOf(v),
    timeouts: [v.seats[0]?.timeouts ?? 0, v.seats[1]?.timeouts ?? 0],
    deadline: v.deadline ? Date.parse(v.deadline) : 0,
    perBoard: v.points.map((p) => [p[0] ?? 0, p[1] ?? 0] as [number, number]),
    result: v.result ? { winner: v.result.winner === null ? null : seat(v.result.winner), reason: v.result.reason === "score" ? "score" : "forfeit" } : null,
  };
}
