/**
 * Prototype-only rules for the playground's live demo: the real game judges on the server. Solo = one list, 3 lives;
 * rooms = turns on a shared tower, a slot worth its number, 2 lives per list, bots in the other seats.
 */
import { normalizeAnswer } from "@/features/game-mode-lab/lib/text";
import { emptySlots, foundCount, TENABLE_MAX_LIVES_SOLO, type TenableList, type TenableSlot, type TenableSoloState, type TenableVerdict, type TenableView } from "./tenable.view";

export interface SimEntry { rank: number; name: string; aliases: string[]; detail: string }
export interface SimList { id: string; title: string; asOf: string | null; entries: SimEntry[]; decoys: string[] }

function editDistanceAtMostOne(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++; }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

/** Full name or alias; then a surname alone when only one entry has it; one typo from five letters. */
export function judge(list: SimList, text: string): { kind: "match"; entry: SimEntry } | { kind: "ambiguous" } | { kind: "none" } {
  const typed = normalizeAnswer(text);
  if (!typed) return { kind: "none" };
  const forms = (e: SimEntry) => [e.name, ...e.aliases].map(normalizeAnswer);
  const exact = list.entries.filter((e) => forms(e).includes(typed));
  if (exact.length === 1) return { kind: "match", entry: exact[0] };
  if (exact.length > 1) return { kind: "ambiguous" };
  const bySurname = list.entries.filter((e) => normalizeAnswer(e.name).split(" ").at(-1) === typed);
  if (bySurname.length === 1) return { kind: "match", entry: bySurname[0] };
  if (bySurname.length > 1) return { kind: "ambiguous" };
  if (typed.length >= 5) {
    const near = list.entries.filter((e) => forms(e).some((f) => editDistanceAtMostOne(f, typed) || editDistanceAtMostOne(f.split(" ").at(-1) ?? "", typed)));
    if (near.length === 1) return { kind: "match", entry: near[0] };
  }
  return { kind: "none" };
}

const asList = (l: SimList): TenableList => ({ title: l.title, asOf: l.asOf });
const reveal = (list: SimList, slots: TenableSlot[]): TenableSlot[] =>
  slots.map((s, i) => (s.name !== null ? s : { ...s, name: list.entries[i].name, detail: list.entries[i].detail, missed: true }));

export function newSolo(list: SimList, day: string): TenableSoloState {
  return { day, list: asList(list), slots: emptySlots(), lives: TENABLE_MAX_LIVES_SOLO, maxLives: TENABLE_MAX_LIVES_SOLO, misses: [], status: "playing", endReason: null, last: null, ranked: true };
}

export function soloSay(list: SimList, s: TenableSoloState, text: string): TenableSoloState {
  if (s.status === "done" || !text.trim()) return s;
  const id = (s.last?.id ?? 0) + 1;
  const verdict = judge(list, text);
  if (verdict.kind === "ambiguous") return { ...s, last: { id, kind: "ambiguous", text, rank: null } };
  if (verdict.kind === "match") {
    const slot = s.slots[verdict.entry.rank - 1];
    if (slot.name !== null) return { ...s, last: { id, kind: "repeat", text: slot.name, rank: slot.rank } };
    const slots = s.slots.map((x) => (x.rank === verdict.entry.rank ? { ...x, name: verdict.entry.name, detail: verdict.entry.detail, by: 0 } : x));
    const done = foundCount(slots) === 10;
    return { ...s, slots, status: done ? "done" : "playing", endReason: done ? "complete" : null, last: { id, kind: "right", text, rank: verdict.entry.rank } };
  }
  if (s.misses.some((m) => normalizeAnswer(m) === normalizeAnswer(text))) return { ...s, last: { id, kind: "repeat", text, rank: null } };
  const lives = s.lives - 1;
  const out = lives <= 0;
  return { ...s, lives, misses: [...s.misses, text.trim()], status: out ? "done" : "playing", endReason: out ? "lives" : null, slots: out ? reveal(list, s.slots) : s.slots, last: { id, kind: "wrong", text: text.trim(), rank: null } };
}

export const soloGiveUp = (list: SimList, s: TenableSoloState): TenableSoloState =>
  s.status === "done" ? s : { ...s, status: "done", endReason: "gaveUp", slots: reveal(list, s.slots) };

// ── Rooms ────────────────────────────────────────────────────────────────────────────────────────────────────────

export const ROOM_LIVES = 2;
export const TURN_MS = 20_000;
export const INTRO_MS = 3_000;
export const LIST_END_MS = 5_000;

export interface RoomSim { lists: SimList[]; view: TenableView; now: number }

export function newRoom(lists: SimList[], seats: number, now: number): RoomSim {
  return {
    lists, now,
    view: {
      phase: "intro", list: 0, lists: lists.length, format: seats === 2 ? "duel" : "party", turnMs: TURN_MS, current: asList(lists[0]), slots: emptySlots(),
      turn: null, epoch: 0, attempt: 0, maxLives: ROOM_LIVES,
      seats: Array.from({ length: seats }, (_, seat) => ({ seat, status: "in" as const, lives: ROOM_LIVES, score: 0, found: 0 })),
      mySeat: 0, last: null, listEnd: null, listPoints: null, final: false, standings: null, deadline: new Date(now + INTRO_MS).toISOString(),
    },
  };
}

const alive = (v: TenableView) => v.seats.filter((s) => s.status === "in" && s.lives > 0).map((s) => s.seat);

function nextSeat(v: TenableView, after: number): number | null {
  const live = alive(v);
  if (live.length === 0) return null;
  for (let k = 1; k <= v.seats.length; k++) {
    const seat = (after + k) % v.seats.length;
    if (live.includes(seat)) return seat;
  }
  return null;
}

function startTurn(sim: RoomSim, v: TenableView, seat: number): RoomSim {
  return { ...sim, view: { ...v, phase: "turn", turn: seat, epoch: v.epoch + 1, attempt: 0, deadline: new Date(sim.now + TURN_MS).toISOString() } };
}

function endList(sim: RoomSim, v: TenableView, reason: "complete" | "out"): RoomSim {
  const list = sim.lists[v.list];
  const listPoints = v.seats.map((s) => v.slots.filter((x) => x.by === s.seat).reduce((sum, x) => sum + x.rank, 0));
  const final = v.list + 1 >= v.lists;
  const seats = v.seats.map((s) => ({ ...s, score: s.score + listPoints[s.seat] }));
  return {
    ...sim,
    view: {
      ...v, seats, phase: "listEnd", turn: null, listEnd: { reason }, listPoints, final, slots: reveal(list, v.slots),
      deadline: new Date(sim.now + LIST_END_MS).toISOString(), standings: final ? standingsOf(seats) : null,
    },
  };
}

function standingsOf(seats: TenableView["seats"]): NonNullable<TenableView["standings"]> {
  const playing = seats.filter((s) => s.status !== "withdrawn");
  return [...seats]
    .sort((a, b) => Number(a.status === "withdrawn") - Number(b.status === "withdrawn") || b.score - a.score || b.found - a.found)
    .map((s) => ({ seat: s.seat, points: s.score, roundWins: s.found, place: s.status === "withdrawn" ? playing.length + 1 : 1 + playing.filter((o) => o.score > s.score).length }));
}

/** After a judged answer or a timeout: next seat, or the list is over. */
function afterMove(sim: RoomSim, v: TenableView, from: number): RoomSim {
  if (foundCount(v.slots) === 10) return endList(sim, v, "complete");
  const next = nextSeat(v, from);
  return next === null ? endList(sim, v, "out") : startTurn(sim, v, next);
}

export function roomAnswer(sim: RoomSim, seat: number, text: string): RoomSim {
  const v = sim.view;
  if (v.phase !== "turn" || v.turn !== seat || !text.trim()) return sim;
  const list = sim.lists[v.list];
  const verdict = judge(list, text);
  const said = (kind: TenableVerdict, rank: number | null, shown = text.trim()) => ({ epoch: v.epoch, attempt: v.attempt, seat, kind, text: shown, rank });
  if (verdict.kind === "ambiguous") return { ...sim, view: { ...v, attempt: v.attempt + 1, last: said("ambiguous", null) } };
  if (verdict.kind === "match") {
    const slot = v.slots[verdict.entry.rank - 1];
    if (slot.name !== null) return { ...sim, view: { ...v, attempt: v.attempt + 1, last: said("repeat", slot.rank, slot.name) } };
    const slots = v.slots.map((x) => (x.rank === slot.rank ? { ...x, name: verdict.entry.name, detail: verdict.entry.detail, by: seat } : x));
    const seats = v.seats.map((s) => (s.seat === seat ? { ...s, found: s.found + 1 } : s));
    return afterMove(sim, { ...v, slots, seats, last: said("right", slot.rank) }, seat);
  }
  const seats = v.seats.map((s) => (s.seat === seat ? { ...s, lives: s.lives - 1 } : s));
  return afterMove(sim, { ...v, seats, last: said("wrong", null) }, seat);
}

/** Advances the clock: intro → first turn, an expired turn costs a life, a finished list → the next one. */
export function roomTick(sim: RoomSim, now: number): RoomSim {
  const s = { ...sim, now };
  const v = s.view;
  if (!v.deadline || Date.parse(v.deadline) > now) return s;
  if (v.phase === "intro") return startTurn(s, v, v.list % v.seats.length);
  if (v.phase === "turn" && v.turn !== null) {
    const seats = v.seats.map((x) => (x.seat === v.turn ? { ...x, lives: x.lives - 1 } : x));
    return afterMove(s, { ...v, seats, last: { epoch: v.epoch, attempt: v.attempt, seat: v.turn, kind: "time", text: "", rank: null } }, v.turn);
  }
  if (v.phase === "listEnd") {
    if (v.final) return { ...s, view: { ...v, phase: "over", deadline: null } };
    const list = v.list + 1;
    const fresh: TenableView = {
      ...v, list, current: asList(s.lists[list]), slots: emptySlots(), listEnd: null, listPoints: null, last: null,
      seats: v.seats.map((x) => ({ ...x, lives: x.status === "in" ? ROOM_LIVES : 0 })),
    };
    const opener = nextSeat(fresh, (list - 1 + fresh.seats.length) % fresh.seats.length) ?? 0;
    return startTurn(s, fresh, opener);
  }
  return s;
}

/** A bot's move: usually a right answer still hidden, sometimes a wrong name. */
export function botMove(sim: RoomSim, skill: number): string {
  const list = sim.lists[sim.view.list];
  const hidden = list.entries.filter((e) => sim.view.slots[e.rank - 1].name === null);
  // Deeper slots are harder: the chance falls with the rank.
  const pick = hidden.find((e) => Math.random() < skill * (1.1 - e.rank / 12));
  if (pick) return Math.random() < 0.5 ? pick.name : pick.name.split(" ").at(-1) ?? pick.name;
  return list.decoys[Math.floor(Math.random() * list.decoys.length)] ?? "Nobody";
}

export function withdraw(sim: RoomSim, seat: number): RoomSim {
  const v = sim.view;
  const seats = v.seats.map((s) => (s.seat === seat ? { ...s, status: "withdrawn" as const, lives: 0 } : s));
  const next = { ...v, seats };
  if (v.phase === "turn" && v.turn === seat) return afterMove(sim, next, seat);
  return { ...sim, view: next };
}
