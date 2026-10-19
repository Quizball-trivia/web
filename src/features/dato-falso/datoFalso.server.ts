import type { RoomClientRules } from "@/features/room/useRoomConnection";
import { DF_CARD_MS_ROOM, type DfArt, type DfCard, type DfCategory, type DfCommand, type DfJoker, type DfRoomView } from "./datoFalso.view";

type ServerArt = { kind: "crest" | "flag"; src: string } | { kind: "trophy"; src?: string } | { kind: "shirt"; number: number } | { kind: "text" };
/** A card as the server sends it before its reveal (backend dato-falso.rules publicCard): options by position. */
export interface DfServerCard { id: string; category: DfCategory; player: { name: string; portrait: string | null }; options: Array<{ label: string; art: ServerArt }> }
interface ServerEntry { seat: number; pick: number | null; cut: boolean; doubled: boolean; right: boolean; points: number }

/** The room view the server sends (backend dato-falso.engine viewOf). */
export interface DatoFalsoServerView {
  phase: "intro" | "card" | "reveal" | "over";
  card: number;
  totalCards: number;
  current: DfServerCard | null;
  seats: Array<{ seat: number; status: "in" | "away" | "withdrawn"; answered: boolean; idle: boolean; score: number; jokers: { cut: boolean; double: boolean } | null }>;
  mySeat: number;
  mine: { pick: number | null; removed: number[]; doubled: boolean; jokers: { cut: boolean; double: boolean } };
  reveal: { card: number; fake: number; entries: ServerEntry[]; explain: string } | null;
  results: Array<{ card: number; fake: number; entries: ServerEntry[] }>;
  standings: Array<{ seat: number; points: number; roundWins: number; place: number }> | null;
  deadline: string | null;
}

export const toArt = (art: ServerArt): DfArt => {
  if (art.kind === "shirt") return { kind: "shirt", number: String(art.number) };
  if (art.kind === "text") return { kind: "text" };
  if (art.kind === "trophy") return art.src ? { kind: "trophy", src: art.src } : { kind: "text" };
  return { kind: art.kind, src: art.src };
};

/** Option ids on screen are their positions: what the server takes back in a pick. */
export const toCard = (c: DfServerCard, level: DfCard["level"] = 2): DfCard => ({
  id: c.id,
  category: c.category,
  subject: { name: c.player.name, portrait: c.player.portrait, kind: c.category === "coachedClubs" ? "coach" : "player" },
  options: c.options.map((o, i) => ({ id: String(i), label: o.label, art: toArt(o.art) })),
  level,
});

const used = (j: { cut: boolean; double: boolean } | null): DfJoker[] => (j ? [...(j.cut ? ["cut" as const] : []), ...(j.double ? ["double" as const] : [])] : []);

/** The server view in the screens' shape. */
export function toRoomView(v: DatoFalsoServerView): DfRoomView {
  const rights = (seat: number) => v.results.filter((r) => r.entries[seat]?.right).length;
  return {
    phase: v.phase,
    index: v.card,
    total: v.totalCards,
    format: v.seats.length === 2 ? "duel" : "party",
    cardMs: DF_CARD_MS_ROOM,
    card: v.current ? toCard(v.current) : null,
    removed: v.mine.removed.map(String),
    myDoubled: v.mine.doubled,
    myPick: v.mine.pick === null ? null : String(v.mine.pick),
    seats: v.seats.map((s) => ({ seat: s.seat, status: s.status, score: s.score, right: rights(s.seat), answered: s.answered, jokersUsed: used(s.jokers) })),
    mySeat: v.mySeat,
    reveal: v.reveal && {
      fake: String(v.reveal.fake),
      explain: v.reveal.explain,
      picks: v.reveal.entries.map((e) => ({ seat: e.seat, pick: e.pick === null ? null : String(e.pick), points: e.points, cut: e.cut, doubled: e.doubled })),
    },
    final: v.phase === "over" || v.card + 1 >= v.totalCards,
    standings: v.standings,
    deadline: v.deadline,
  };
}

/**
 * A pick or joker is one slot per card; it is settled once the screen shows it, or once that card is no longer open
 * (a reveal moved on, or the clock closed it).
 */
export const datoFalsoRoomRules: RoomClientRules<DfCommand> = {
  slot: (c) => (c.type === "pick" ? `p:${c.card}` : `j:${c.card}:${c.kind}`),
  settled: (raw, c) => {
    const v = raw as Partial<DatoFalsoServerView>;
    if (v.phase !== "card" || v.card !== c.card) return true;
    if (c.type === "pick") return v.mine?.pick !== null && v.mine?.pick !== undefined;
    return Boolean(v.mine?.jokers?.[c.kind === "cut" ? "cut" : "double"]);
  },
};
