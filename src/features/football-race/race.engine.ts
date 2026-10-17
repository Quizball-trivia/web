import { compare, rng, type L10n, type RacePack } from "./race.rules";

/**
 * The match as a pure state machine (the shape a room engine needs: state in, state out, `now` passed in, a deadline at
 * every moment, a seed instead of Math.random). Each round every seat secretly picks one unused stat; then the picks are
 * shown one by one, fastest first, and each moves the racer that leads it. How the race ends is `EngineConfig.finish`.
 *
 * Every step a screen shows is its own transition with its own deadline (question up → values out → next pick), so a
 * runtime that wakes at deadlines publishes each one: nothing about a pick is in a seat's view before its step.
 */
export type Phase = "intro" | "pick" | "reveal" | "over";

export interface EngineConfig {
  pack: RacePack;
  /** Nation id per seat. */
  racers: string[];
  /** Stats playable in this match (the theme). */
  statIds: string[];
  target: number;
  seed: number;
  introMs: number;
  pickMs: number;
  /** One pick on screen during the reveal: the question first (SUSPENSE of it), then the values. */
  revealStepMs: number;
  /** After the last pick's values, before the next round. */
  revealTailMs: number;
  maxRounds: number;
  /**
   * "instant": the race stops at the pick that puts a racer on the line (later picks of the round are never shown).
   * "round": the whole round counts, then the racer alone in front wins (level at the line = another round).
   */
  finish: "instant" | "round";
}

/** Share of a reveal step spent on the question before the values (and the move) come out. */
export const SUSPENSE = 0.3;

export interface PickResult {
  /** Who picked it. */
  seat: number;
  statId: string;
  /** Picked by the clock, not the player. */
  auto: boolean;
  /** Value per seat's racer. */
  values: number[];
  /** Seats whose racer leads it (two or more = a tie: all of them move). */
  leaders: number[];
  /** Per seat's racer: the match, years or player behind its number. */
  details: Array<L10n | null>;
}

/** "line": a racer finished. "stats": every stat of the theme was played. "rounds": the round cap. The last two go to whoever is furthest (shared when level). */
export type EndReason = "line" | "stats" | "rounds";

export interface EngineState {
  phase: Phase;
  round: number;
  deadline: number;
  /** Spaces per seat: a pick counts the moment its values come out. */
  positions: number[];
  picks: Array<string | null>;
  /** When each seat locked its pick this round: the fastest pick is revealed first. */
  pickedAt: Array<number | null>;
  used: string[];
  /** The picks this round will show, in order (an instant finish cuts the list at the pick that ends the race). */
  reveal: PickResult[] | null;
  /** Picks made this round: the public count, so a cut list never gives the ending away. */
  revealPlanned: number;
  /** The pick on screen, and whether its values are out. */
  revealIndex: number;
  revealOpen: boolean;
  rounds: PickResult[][];
  /** More than one racer crossed the line level: play on until one is alone in front. */
  suddenDeath: boolean;
  winners: number[] | null;
  endedBy: EndReason | null;
  autoPicks: number;
}

export type PickError = "not_open" | "already_picked" | "unknown_stat" | "stat_used" | "bad_seat";

export function startMatch(seats: number, cfg: EngineConfig, now: number): EngineState {
  const empty = <T,>(value: T) => Array.from({ length: seats }, () => value);
  return {
    phase: "intro", round: 0, deadline: now + cfg.introMs, positions: empty(0), picks: empty<string | null>(null), pickedAt: empty<number | null>(null), used: [],
    reveal: null, revealPlanned: 0, revealIndex: 0, revealOpen: false, rounds: [], suddenDeath: false, winners: null, endedBy: null, autoPicks: 0,
  };
}

export function submitPick(state: EngineState, cfg: EngineConfig, seat: number, statId: string, now: number): { state: EngineState; error?: PickError } {
  if (state.phase !== "pick" || now >= state.deadline) return { state, error: "not_open" };
  if (seat < 0 || seat >= state.picks.length) return { state, error: "bad_seat" };
  if (state.picks[seat] !== null) return { state, error: "already_picked" };
  if (!cfg.statIds.includes(statId)) return { state, error: "unknown_stat" };
  if (state.used.includes(statId)) return { state, error: "stat_used" };
  const picks = state.picks.map((p, i) => (i === seat ? statId : p));
  const next = { ...state, picks, pickedAt: state.pickedAt.map((t, i) => (i === seat ? now : t)) };
  return { state: picks.every((p) => p !== null) ? settle(next, cfg, now) : next };
}

/** The round closes: empty seats get a random unused stat, every pick is compared, and the first pick goes on screen. */
function settle(state: EngineState, cfg: EngineConfig, now: number): EngineState {
  const metricOf = new Map(cfg.pack.metrics.map((m) => [m.id, m]));
  const statOf = new Map(cfg.pack.stats.map((s) => [s.id, s]));
  const unused = cfg.statIds.filter((id) => !state.used.includes(id));
  const chosen = new Set(state.picks.filter((p): p is string => p !== null));
  // The clock's picks avoid stats already chosen this round while they can; with none left they double up, as a player may.
  const fresh = unused.filter((id) => !chosen.has(id));
  let autoPicks = state.autoPicks;
  const auto: boolean[] = [];
  const picks = state.picks.map((p, seat) => {
    auto[seat] = p === null;
    if (p !== null) return p;
    autoPicks += 1;
    const random = rng(cfg.seed + autoPicks * 7919);
    if (fresh.length) return fresh.splice(Math.floor(random() * fresh.length), 1)[0];
    return unused.length ? unused[Math.floor(random() * unused.length)] : null;
  });
  // Fastest pick first; the clock's picks last. Level times fall back to a seat order that rotates round by round.
  const turn = (seat: number) => (seat - state.round + picks.length * (state.round + 1)) % picks.length;
  const order = picks.map((_, seat) => seat).sort((a, b) => (state.pickedAt[a] ?? Infinity) - (state.pickedAt[b] ?? Infinity) || turn(a) - turn(b));
  const all: PickResult[] = order.flatMap((seat) => {
    const statId = picks[seat];
    if (!statId) return [];
    const stat = statOf.get(statId)!;
    const c = compare(stat, metricOf.get(stat.metric)!, cfg.racers);
    return c ? [{ seat, statId, auto: auto[seat], values: c.values, leaders: c.leaders, details: c.details }] : [];
  });
  // Instant finish: the pick that puts a racer on the line is the last one shown.
  let reveal = all;
  if (cfg.finish === "instant") {
    const positions = [...state.positions];
    const last = all.findIndex((r) => { for (const seat of r.leaders) positions[seat] += 1; return Math.max(...positions) >= cfg.target; });
    if (last >= 0) reveal = all.slice(0, last + 1);
  }
  const settled: EngineState = {
    ...state, phase: "reveal", picks, reveal, revealPlanned: all.length, revealIndex: 0, revealOpen: false, autoPicks,
    used: [...state.used, ...new Set(reveal.map((r) => r.statId))], deadline: now + cfg.revealStepMs * SUSPENSE,
  };
  return reveal.length ? settled : closeRound(settled, cfg, now);
}

function openRound(state: EngineState, cfg: EngineConfig, now: number, round: number, suddenDeath: boolean): EngineState {
  return {
    ...state, phase: "pick", round, suddenDeath, picks: state.picks.map(() => null), pickedAt: state.pickedAt.map(() => null),
    reveal: null, revealPlanned: 0, revealIndex: 0, revealOpen: false, deadline: now + cfg.pickMs,
  };
}

/** Every pick of the round has been shown: the race is over, or the next round opens. */
function closeRound(state: EngineState, cfg: EngineConfig, now: number): EngineState {
  const rounds = [...state.rounds, state.reveal ?? []];
  const top = Math.max(...state.positions);
  const front = state.positions.flatMap((p, seat) => (p === top ? [seat] : []));
  const crossed = top >= cfg.target;
  const over = (endedBy: EndReason): EngineState => ({ ...state, phase: "over", rounds, reveal: null, winners: front, endedBy, deadline: now });
  // Instant finish: racers level on the line (one tied pick moved them together) share the win.
  if (crossed && (front.length === 1 || cfg.finish === "instant")) return over("line");
  if (state.used.length >= cfg.statIds.length) return over("stats");
  if (state.round + 1 >= cfg.maxRounds) return over("rounds");
  return openRound({ ...state, rounds }, cfg, now, state.round + 1, crossed);
}

/** One transition when its deadline has passed (call again while the state keeps changing to catch up after a late wake). */
export function tick(state: EngineState, cfg: EngineConfig, now: number): EngineState {
  if (state.phase === "over" || now < state.deadline) return state;
  if (state.phase === "intro") return openRound(state, cfg, now, 0, false);
  if (state.phase === "pick") return settle(state, cfg, now);
  const reveal = state.reveal ?? [];
  if (!state.revealOpen) {
    const positions = [...state.positions];
    for (const seat of reveal[state.revealIndex].leaders) positions[seat] += 1;
    const last = state.revealIndex === reveal.length - 1;
    return { ...state, positions, revealOpen: true, deadline: now + cfg.revealStepMs * (1 - SUSPENSE) + (last ? cfg.revealTailMs : 0) };
  }
  if (state.revealIndex + 1 < reveal.length) return { ...state, revealIndex: state.revealIndex + 1, revealOpen: false, deadline: now + cfg.revealStepMs * SUSPENSE };
  return closeRound(state, cfg, now);
}

export interface Standing { seat: number; place: number; position: number; goodCalls: number; backfires: number }

/** Final table: furthest first (shared places), with how many of each seat's own picks moved its own racer. */
export function standings(state: EngineState): Standing[] {
  const all = state.rounds.flat();
  return state.positions
    .map((position, seat) => {
      const mine = all.filter((r) => r.seat === seat && !r.auto);
      const good = mine.filter((r) => r.leaders.includes(seat)).length;
      return { seat, position, goodCalls: good, backfires: mine.length - good, place: 1 + state.positions.filter((p) => p > position).length };
    })
    .sort((a, b) => a.place - b.place || a.seat - b.seat);
}
