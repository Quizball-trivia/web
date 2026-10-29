/**
 * Prototype-only rules for the playground's live demo: the real game judges on the server against private categories.
 * Who an answer means is decided against every player of every category first (never the leg's own list), so a real
 * footballer outside the category is a miss and only a name nobody knows is free.
 */
import { judge, type SimEntry } from "@/features/tenable/tenable.sim";
import { BOGEYS, D501, THROWN, checkoutWindow, judgeDart, type DartVerdict } from "./d501.rules";
import type { D501Category, D501SoloState, D501View, Dart } from "./d501.view";

export interface SimPlayer { name: string; aliases: string[]; stat: number }
export interface SimCategory { id: string; title: string; unit: string; asOf: string | null; players: SimPlayer[] }

const category = (c: SimCategory): D501Category => ({ title: c.title, unit: c.unit, asOf: c.asOf, kind: "player", release: "prototype" });

/** Everyone the prototype knows, once each (the same footballer appears in several categories). */
export function universe(categories: readonly SimCategory[]): SimEntry[] {
  const seen = new Map<string, SimEntry>();
  for (const c of categories) for (const p of c.players) if (!seen.has(p.name)) seen.set(p.name, { rank: seen.size + 1, name: p.name, aliases: p.aliases, detail: "" });
  return [...seen.values()];
}

let nextId = 1;
/** Reads one answer: who it means, then that player's number in the category (null when he is not in it). */
function read(all: SimEntry[], cat: SimCategory, used: ReadonlySet<string>, text: string): { verdict: "repeat" | "unknown" | "ambiguous" } | { name: string; stat: number | null } {
  const hit = judge({ id: "all", title: "", asOf: null, entries: all, decoys: [] }, text);
  if (hit.kind === "ambiguous") return { verdict: "ambiguous" };
  if (hit.kind === "none") return { verdict: "unknown" };
  if (used.has(hit.entry.name)) return { verdict: "repeat" };
  return { name: hit.entry.name, stat: cat.players.find((p) => p.name === hit.entry.name)?.stat ?? null };
}

const usedNames = (darts: readonly Dart[]) => new Set(darts.filter((d) => THROWN.has(d.verdict) && d.name).map((d) => d.name!));

function throwAt(all: SimEntry[], cat: SimCategory, darts: readonly Dart[], remaining: number, by: number, text: string, pro: boolean): Dart {
  const r = read(all, cat, usedNames(darts), text);
  if ("verdict" in r) return { id: nextId++, by, text, name: null, stat: null, verdict: r.verdict, before: remaining, after: remaining };
  const { verdict, after } = judgeDart(remaining, r.stat, pro);
  return { id: nextId++, by, text, name: r.name, stat: r.stat, verdict, before: remaining, after };
}

/** Unused answers that check out from `remaining` (the hint the TV show puts on screen). */
function outsFrom(cat: SimCategory, remaining: number, darts: readonly Dart[], pro: boolean): number | null {
  const w = checkoutWindow(remaining);
  if (!w) return null;
  const used = usedNames(darts);
  return cat.players.filter((p) => !used.has(p.name) && p.stat >= w.low && p.stat <= w.high && !(pro && BOGEYS.has(p.stat))).length;
}

// ── Solo ────────────────────────────────────────────────────────────────────────────────────────────────────────────

export const newSolo = (cat: SimCategory, day: string): D501SoloState => ({
  day, category: category(cat), remaining: D501.start, darts: [], maxDarts: D501.soloDarts, status: "playing", endReason: null, last: null, ranked: true, outs: null,
});

function finishesFrom(cat: SimCategory, remaining: number, darts: readonly Dart[]) {
  const w = checkoutWindow(remaining);
  if (!w) return [];
  const used = usedNames(darts);
  return cat.players.filter((p) => !used.has(p.name) && p.stat >= w.low && p.stat <= w.high).sort((a, b) => a.stat - b.stat).slice(0, 5).map((p) => ({ name: p.name, stat: p.stat }));
}

export function soloSay(categories: readonly SimCategory[], cat: SimCategory, s: D501SoloState, text: string, pro = false): D501SoloState {
  if (s.status !== "playing") return s;
  const dart = throwAt(universe(categories), cat, s.darts, s.remaining, 0, text, pro);
  if (!THROWN.has(dart.verdict)) return { ...s, last: dart };
  const darts = [...s.darts, dart];
  const thrown = darts.length;
  const end = dart.verdict === "checkout" ? "checkout" : thrown >= s.maxDarts ? "darts" : null;
  const next = { ...s, darts, remaining: dart.after, last: dart, outs: outsFrom(cat, dart.after, darts, pro) };
  return end ? { ...next, status: "done", endReason: end, finishes: end === "darts" ? finishesFrom(cat, dart.after, darts) : undefined } : next;
}

export const soloGiveUp = (cat: SimCategory, s: D501SoloState): D501SoloState =>
  s.status === "done" ? s : { ...s, status: "done", endReason: "gaveUp", finishes: finishesFrom(cat, s.remaining, s.darts) };

// ── Rooms ───────────────────────────────────────────────────────────────────────────────────────────────────────────

/** `round`: seats that already threw in this round (a checkout lets the rest of the round throw). */
export interface RoomSim { categories: SimCategory[]; view: D501View; now: number; round: number[]; pro: boolean }
const INTRO_MS = 3_000;
const LEG_END_MS = 4_000;

const legsToWin = (v: D501View) => (v.format === "duel" ? Math.floor(v.legs / 2) + 1 : v.legs);
const canThrow = (v: D501View, seat: number) => v.seats[seat].status !== "withdrawn" && v.seats[seat].remaining > 0 && v.seats[seat].dartsUsed < v.maxDarts;
const legCategory = (sim: RoomSim, leg = sim.view.leg) => sim.categories[leg % sim.categories.length];

export function newRoom(all: readonly SimCategory[], n: number, now: number, pro = false): RoomSim {
  const categories = [...all].sort(() => Math.random() - 0.5);
  return {
    categories, now, round: [], pro,
    view: {
      phase: "intro", leg: 0, legs: D501.legs, format: n === 2 ? "duel" : "party", turnMs: D501.turnMs, maxDarts: D501.roomDarts, current: category(categories[0]),
      seats: Array.from({ length: n }, (_, seat) => ({ seat, status: "in" as const, remaining: D501.start, dartsUsed: 0, legsWon: 0, leftTotal: 0 })),
      turn: null, epoch: 0, attempt: 0, mySeat: 0, darts: [], last: null, finishing: [], legEnd: null, final: false, standings: null,
      deadline: new Date(now + INTRO_MS).toISOString(),
    },
  };
}

/** The next seat after `after` that can throw, optionally only among seats that have not thrown this round. */
function nextThrower(v: D501View, after: number, skip: readonly number[] = []): number | null {
  const n = v.seats.length;
  for (let k = 1; k <= n; k++) { const seat = (after + k) % n; if (canThrow(v, seat) && !skip.includes(seat)) return seat; }
  return null;
}

function standings(v: D501View) {
  const live = v.seats.filter((s) => s.status !== "withdrawn");
  const better = (a: typeof v.seats[number], b: typeof v.seats[number]) => a.legsWon > b.legsWon || (a.legsWon === b.legsWon && a.leftTotal < b.leftTotal);
  return v.seats.map((s) => ({ seat: s.seat, points: s.legsWon, roundWins: s.legsWon, place: s.status === "withdrawn" ? live.length + 1 : 1 + live.filter((o) => better(o, s)).length }));
}

function endLeg(sim: RoomSim, winner: number | null, reason: "checkout" | "darts" | "out"): RoomSim {
  const v = sim.view;
  const seats = v.seats.map((s) => ({ ...s, legsWon: s.legsWon + (s.seat === winner ? 1 : 0), leftTotal: s.leftTotal + Math.max(0, s.remaining) }));
  const decided = v.format === "duel" && seats.some((s) => s.legsWon >= legsToWin(v));
  const alone = seats.filter((s) => s.status !== "withdrawn").length < 2;
  const final = decided || alone || v.leg + 1 >= v.legs;
  return { ...sim, round: [], view: { ...v, seats, phase: "legEnd", turn: null, outs: null, legEnd: { winner, reason }, final, deadline: new Date(sim.now + LEG_END_MS).toISOString() } };
}

function startTurn(sim: RoomSim, seat: number): RoomSim {
  const v = sim.view;
  return { ...sim, view: { ...v, phase: "turn", turn: seat, epoch: v.epoch + 1, attempt: 0, outs: outsFrom(legCategory(sim), v.seats[seat].remaining, v.darts, sim.pro),
    deadline: new Date(sim.now + v.turnMs).toISOString() } };
}

/**
 * After `from` has thrown (or left): the rest of the round throws; at the end of a round with a checkout, the seat closest to 0
 * takes the leg (the first to get there on a tie); when nobody can throw any more, the lowest score does.
 */
function advance(sim: RoomSim, from: number): RoomSim {
  const v = sim.view;
  const inRound = nextThrower(v, from, sim.round);
  if (inRound !== null) return startTurn(sim, inRound);
  if (v.finishing.length > 0) {
    const best = v.finishing.reduce((a, b) => (b.at > a.at ? b : a));
    return endLeg(sim, best.seat, "checkout");
  }
  const next = nextThrower(v, from);
  if (next !== null) return startTurn({ ...sim, round: [] }, next);
  const live = v.seats.filter((s) => s.status !== "withdrawn");
  const low = Math.min(...live.map((s) => s.remaining));
  const lows = live.filter((s) => s.remaining === low);
  return endLeg(sim, lows.length === 1 ? lows[0].seat : null, "darts");
}

function applyDart(sim: RoomSim, dart: Dart): RoomSim {
  const v = sim.view;
  if (!THROWN.has(dart.verdict)) return { ...sim, view: { ...v, last: dart, attempt: v.attempt + 1 } };
  const seats = v.seats.map((s) => (s.seat === dart.by ? { ...s, remaining: dart.after, dartsUsed: s.dartsUsed + 1 } : s));
  const finishing = dart.verdict === "checkout" ? [...v.finishing, { seat: dart.by, at: dart.after }] : v.finishing;
  return advance({ ...sim, round: [...sim.round, dart.by], view: { ...v, seats, darts: [...v.darts, dart], last: dart, finishing } }, dart.by);
}

export function roomAnswer(sim: RoomSim, seat: number, text: string): RoomSim {
  const v = sim.view;
  if (v.phase !== "turn" || v.turn !== seat) return sim;
  return applyDart(sim, throwAt(universe(sim.categories), legCategory(sim), v.darts, v.seats[seat].remaining, seat, text, sim.pro));
}

export function roomTick(sim0: RoomSim, now: number): RoomSim {
  const sim = { ...sim0, now };
  const v = sim.view;
  if (!v.deadline || now < Date.parse(v.deadline)) return sim0;
  if (v.phase === "intro") return startTurn(sim, v.leg % v.seats.length);
  if (v.phase === "turn" && v.turn !== null) {
    const s = v.seats[v.turn];
    const dart: Dart = { id: nextId++, by: v.turn, text: "", name: null, stat: null, verdict: "time" as DartVerdict, before: s.remaining, after: s.remaining };
    return applyDart(sim, dart);
  }
  if (v.phase === "legEnd") {
    if (v.final) return { ...sim, view: { ...v, phase: "over", standings: standings(v), deadline: null } };
    const leg = v.leg + 1;
    const seats = v.seats.map((s) => ({ ...s, remaining: D501.start, dartsUsed: 0 }));
    const fresh: D501View = { ...v, leg, seats, darts: [], last: null, finishing: [], legEnd: null, current: category(legCategory(sim, leg)) };
    // The opener moves one seat on each leg.
    const opener = nextThrower(fresh, (leg - 1 + seats.length) % seats.length);
    return opener === null ? sim0 : startTurn({ ...sim, round: [], view: fresh }, opener);
  }
  return sim0;
}

export function withdraw(sim: RoomSim, seat: number): RoomSim {
  const v = sim.view;
  const seats = v.seats.map((s) => (s.seat === seat ? { ...s, status: "withdrawn" as const } : s));
  const next = { ...sim, view: { ...v, seats, finishing: v.finishing.filter((f) => f.seat !== seat) } };
  if (seats.filter((s) => s.status !== "withdrawn").length < 2) return { ...next, view: { ...next.view, phase: "over", standings: standings(next.view), deadline: null } };
  return v.phase === "turn" && v.turn === seat ? advance(next, seat) : next;
}

/** A bot's dart: big numbers early, aims at the window late; `skill` is how often it knows the right name. */
export function botMove(sim: RoomSim, skill: number): string {
  const v = sim.view;
  const seat = v.turn ?? 0;
  const cat = legCategory(sim);
  const used = usedNames(v.darts);
  const left = cat.players.filter((p) => !used.has(p.name));
  if (Math.random() > skill || left.length === 0) {
    const others = sim.categories.flatMap((c) => c.players).filter((p) => !cat.players.some((q) => q.name === p.name) && !used.has(p.name));
    return others[Math.floor(Math.random() * others.length)]?.name ?? "Nobody";
  }
  const remaining = v.seats[seat].remaining;
  const safe = left.filter((p) => p.stat <= D501.maxDart && remaining - p.stat >= D501.floor);
  if (safe.length === 0) return left[0].name;
  if (remaining > 220) return [...safe].sort((a, b) => b.stat - a.stat)[Math.floor(Math.random() * 3)]?.name ?? safe[0].name;
  const ranked = [...safe].sort((a, b) => Math.abs(remaining - a.stat) - Math.abs(remaining - b.stat));
  return (Math.random() < 0.3 && ranked[1] ? ranked[1] : ranked[0]).name;
}

/** Suggestions for the prototype: names starting with the text, from everyone the prototype knows (never one category). */
export function simLookup(categories: readonly SimCategory[]) {
  const all = universe(categories);
  return async (_kind: string, _release: string, q: string) => {
    const t = q.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    return all.filter((e) => [e.name, ...e.aliases].some((n) => norm(n).split(" ").some((w) => w.startsWith(t)) || norm(n).startsWith(t))).slice(0, 6)
      .map((e) => ({ eid: e.name, label: e.name, qualifier: null }));
  };
}
