/**
 * Prototype-only rules for the playground's live demo; the real game judges on the server, which alone knows the fakes.
 * Solo = 10 cards, 30 s each, two jokers per run. Rooms = every seat answers the same card at once, reveal, next card.
 */
import {
  DF_CARD_MS_ROOM, DF_CARD_MS_SOLO, DF_CARDS_SOLO, DF_REVEAL_MS_ROOM,
  type DfCard, type DfJoker, type DfMark, type DfRoomView, type DfSoloState,
} from "./datoFalso.view";

/** A card with its answer, as only the server holds it. */
export interface SimCard extends DfCard { fake: string; explain: { en: string; es: string } }

const publicCard = (c: SimCard): DfCard => ({ id: c.id, category: c.category, subject: c.subject, options: c.options, level: c.level });
const explainIn = (card: SimCard, locale: string) => (locale === "es" ? card.explain.es : card.explain.en);
const iso = (ms: number) => new Date(ms).toISOString();
export const pointsFor = (right: boolean, doubled: boolean) => (right ? (doubled ? 2 : 1) : doubled ? -1 : 0);

/** Two true options, chosen at random: the fake always stays on the card. */
export function cutTwo(card: SimCard, random: () => number = Math.random): string[] {
  const truths = card.options.map((o) => o.id).filter((id) => id !== card.fake);
  for (let i = truths.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [truths[i], truths[j]] = [truths[j], truths[i]];
  }
  return truths.slice(0, 2);
}

// ── Solo ─────────────────────────────────────────────────────────────────────────────────────────────────────────

export function newSolo(deck: SimCard[], day: string, now: number): DfSoloState {
  return {
    day, total: Math.min(DF_CARDS_SOLO, deck.length), index: 0, card: publicCard(deck[0]), removed: [], doubled: false, reveal: null,
    jokersUsed: [], marks: [], score: 0, status: "playing", ranked: true, deadline: iso(now + DF_CARD_MS_SOLO),
  };
}

export function soloJoker(deck: SimCard[], s: DfSoloState, joker: DfJoker, random: () => number = Math.random): DfSoloState {
  if (s.status === "done" || s.reveal || s.jokersUsed.includes(joker)) return s;
  if (joker === "cut") return { ...s, jokersUsed: [...s.jokersUsed, "cut"], removed: cutTwo(deck[s.index], random) };
  return { ...s, jokersUsed: [...s.jokersUsed, "double"], doubled: true };
}

/** `option` null = the clock ran out. */
export function soloSettle(deck: SimCard[], s: DfSoloState, option: string | null, locale: string): DfSoloState {
  if (s.status === "done" || s.reveal) return s;
  if (option !== null && (s.removed.includes(option) || !s.card.options.some((o) => o.id === option))) return s;
  const card = deck[s.index];
  const right = option === card.fake;
  const points = pointsFor(right, s.doubled);
  const mark: DfMark = { right, points, cut: s.removed.length > 0, double: s.doubled, timedOut: option === null };
  return {
    ...s, score: s.score + points, marks: [...s.marks, mark], deadline: null,
    reveal: { fake: card.fake, explain: explainIn(card, locale), pick: option, points },
  };
}

export function soloNext(deck: SimCard[], s: DfSoloState, now: number): DfSoloState {
  if (!s.reveal) return s;
  if (s.index + 1 >= s.total) return { ...s, status: "done" };
  const index = s.index + 1;
  return { ...s, index, card: publicCard(deck[index]), removed: [], doubled: false, reveal: null, deadline: iso(now + DF_CARD_MS_SOLO) };
}

// ── Rooms ────────────────────────────────────────────────────────────────────────────────────────────────────────

export const INTRO_MS = 3_000;

interface SeatState {
  seat: number; status: "in" | "away" | "withdrawn"; score: number; right: number; jokersUsed: DfJoker[];
  pick: string | null; doubled: boolean; removed: string[];
}

export interface RoomSim {
  deck: SimCard[]; total: number; locale: string; now: number;
  phase: DfRoomView["phase"]; index: number; deadline: number | null;
  seats: SeatState[];
  reveal: DfRoomView["reveal"];
}

export function newRoom(deck: SimCard[], seats: number, now: number, locale: string, total = 10): RoomSim {
  return {
    deck, total: Math.min(total, deck.length), locale, now, phase: "intro", index: 0, deadline: now + INTRO_MS, reveal: null,
    seats: Array.from({ length: seats }, (_, seat) => ({ seat, status: "in" as const, score: 0, right: 0, jokersUsed: [], pick: null, doubled: false, removed: [] })),
  };
}

const playing = (sim: RoomSim) => sim.seats.filter((s) => s.status !== "withdrawn");

function standingsOf(seats: SeatState[]): NonNullable<DfRoomView["standings"]> {
  const live = seats.filter((s) => s.status !== "withdrawn");
  return [...seats]
    .sort((a, b) => Number(a.status === "withdrawn") - Number(b.status === "withdrawn") || b.score - a.score || b.right - a.right || a.seat - b.seat)
    .map((s) => ({ seat: s.seat, points: s.score, roundWins: s.right, place: s.status === "withdrawn" ? live.length + 1 : 1 + live.filter((o) => o.score > s.score).length }));
}

function startCard(sim: RoomSim, index: number): RoomSim {
  return {
    ...sim, phase: "card", index, reveal: null, deadline: sim.now + DF_CARD_MS_ROOM,
    seats: sim.seats.map((s) => ({ ...s, pick: null, doubled: false, removed: [] })),
  };
}

function settle(sim: RoomSim): RoomSim {
  const card = sim.deck[sim.index];
  const picks = sim.seats.filter((s) => s.status !== "withdrawn").map((s) => {
    const right = s.pick === card.fake;
    return { seat: s.seat, pick: s.pick, points: pointsFor(right, s.doubled), cut: s.removed.length > 0, doubled: s.doubled, right };
  });
  const seats = sim.seats.map((s) => {
    const p = picks.find((x) => x.seat === s.seat);
    return p ? { ...s, score: s.score + p.points, right: s.right + Number(p.right) } : s;
  });
  return {
    ...sim, seats, phase: "reveal", deadline: sim.now + DF_REVEAL_MS_ROOM,
    reveal: { fake: card.fake, explain: explainIn(card, sim.locale), picks: picks.map((p) => ({ seat: p.seat, pick: p.pick, points: p.points, cut: p.cut, doubled: p.doubled })) },
  };
}

const everyoneIn = (sim: RoomSim) => playing(sim).filter((s) => s.status === "in").every((s) => s.pick !== null);

export function roomJoker(sim: RoomSim, seat: number, joker: DfJoker, random: () => number = Math.random): RoomSim {
  const me = sim.seats[seat];
  if (sim.phase !== "card" || !me || me.status === "withdrawn" || me.pick !== null || me.jokersUsed.includes(joker)) return sim;
  const changed: SeatState = joker === "cut"
    ? { ...me, jokersUsed: [...me.jokersUsed, "cut"], removed: cutTwo(sim.deck[sim.index], random) }
    : { ...me, jokersUsed: [...me.jokersUsed, "double"], doubled: true };
  return { ...sim, seats: sim.seats.map((s) => (s.seat === seat ? changed : s)) };
}

export function roomPick(sim: RoomSim, seat: number, option: string): RoomSim {
  const me = sim.seats[seat];
  if (sim.phase !== "card" || !me || me.status === "withdrawn" || me.pick !== null || me.removed.includes(option)) return sim;
  if (!sim.deck[sim.index].options.some((o) => o.id === option)) return sim;
  const next = { ...sim, seats: sim.seats.map((s) => (s.seat === seat ? { ...s, pick: option } : s)) };
  return everyoneIn(next) ? settle(next) : next;
}

/** Advances the clock: intro → first card, a card's time up → reveal, a reveal's time up → next card or the end. */
export function roomTick(sim: RoomSim, now: number): RoomSim {
  const s = { ...sim, now };
  if (s.deadline === null || s.deadline > now) return s;
  if (s.phase === "intro") return startCard(s, 0);
  if (s.phase === "card") return settle(s);
  if (s.phase === "reveal") return s.index + 1 >= s.total ? { ...s, phase: "over", deadline: null } : startCard(s, s.index + 1);
  return s;
}

export function withdraw(sim: RoomSim, seat: number): RoomSim {
  const next = { ...sim, seats: sim.seats.map((s) => (s.seat === seat ? { ...s, status: "withdrawn" as const } : s)) };
  return next.phase === "card" && everyoneIn(next) ? settle(next) : next;
}

/** A bot's answer: right more often on easy cards; a wrong one is a random true option. */
export function botAnswer(sim: RoomSim, seat: number, skill: number, random: () => number = Math.random): RoomSim {
  const card = sim.deck[sim.index];
  const me = sim.seats[seat];
  let s = sim;
  if (!me.jokersUsed.includes("double") && card.level === 1 && random() < 0.4) s = roomJoker(s, seat, "double", random);
  else if (!me.jokersUsed.includes("cut") && card.level === 3 && random() < 0.5) s = roomJoker(s, seat, "cut", random);
  const removed = s.seats[seat].removed;
  const base = { 1: 0.85, 2: 0.6, 3: 0.4 }[card.level];
  const chance = Math.min(0.97, base * skill + (removed.length ? 0.2 : 0));
  const left = card.options.map((o) => o.id).filter((id) => !removed.includes(id));
  const wrong = left.filter((id) => id !== card.fake);
  const option = random() < chance || wrong.length === 0 ? card.fake : wrong[Math.floor(random() * wrong.length)];
  return roomPick(s, seat, option);
}

/** The view one seat receives: its own cut and pick, every seat's "answered" flag, other jokers only once revealed. */
export function viewFor(sim: RoomSim, mySeat: number): DfRoomView {
  const me = sim.seats[mySeat];
  const revealed = sim.phase === "reveal" || sim.phase === "over";
  return {
    phase: sim.phase, index: sim.index, total: sim.total, format: sim.seats.length === 2 ? "duel" : "party", cardMs: DF_CARD_MS_ROOM,
    card: sim.phase === "intro" || sim.phase === "over" ? null : publicCard(sim.deck[sim.index]),
    removed: me.removed, myDoubled: me.doubled, myPick: me.pick,
    seats: sim.seats.map((s) => ({
      seat: s.seat, status: s.status, score: s.score, right: s.right, answered: s.pick !== null,
      jokersUsed: s.seat === mySeat || revealed ? s.jokersUsed : s.jokersUsed.filter((j) => !(sim.phase === "card" && j === "double" && s.doubled) && !(sim.phase === "card" && j === "cut" && s.removed.length > 0)),
    })),
    mySeat, reveal: sim.reveal, final: sim.index + 1 >= sim.total,
    standings: sim.phase === "over" ? standingsOf(sim.seats) : null,
    deadline: sim.deadline === null ? null : iso(sim.deadline),
  };
}
