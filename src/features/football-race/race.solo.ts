import { compare, dealMatch, type RacePack } from "./race.rules";
import type { PickResult } from "./race.engine";

/**
 * The daily solo race: your nation (racer 0) against three rivals in one tournament, the same race for everyone that
 * day. You pick every stat; the nation that leads it moves, so a wrong pick moves a rival. Everyone races to `target`,
 * but the rivals start `target - rivalTarget` spaces ahead: three wrong picks that help the same rival lose the race.
 * Fewer picks is a better score.
 */
export interface SoloConfig {
  pack: RacePack;
  /** Nation ids; index 0 is yours. */
  racers: string[];
  statIds: string[];
  target: number;
  rivalTarget: number;
}

export interface SoloState {
  positions: number[];
  used: string[];
  picks: PickResult[];
  result: "won" | "lost" | null;
}

export type SoloError = "over" | "unknown_stat" | "stat_used";

export const startSolo = (cfg: SoloConfig): SoloState =>
  ({ positions: cfg.racers.map((_, i) => (i === 0 ? 0 : cfg.target - cfg.rivalTarget)), used: [], picks: [], result: null });

export function soloPick(state: SoloState, cfg: SoloConfig, statId: string): { state: SoloState; error?: SoloError } {
  if (state.result) return { state, error: "over" };
  if (!cfg.statIds.includes(statId)) return { state, error: "unknown_stat" };
  if (state.used.includes(statId)) return { state, error: "stat_used" };
  const stat = cfg.pack.stats.find((s) => s.id === statId)!;
  const metric = cfg.pack.metrics.find((m) => m.id === stat.metric)!;
  const c = compare(stat, metric, cfg.racers);
  if (!c) return { state, error: "unknown_stat" };
  const positions = [...state.positions];
  for (const seat of c.leaders) positions[seat] += 1;
  const pick: PickResult = { seat: 0, statId, auto: false, values: c.values, leaders: c.leaders, details: c.details };
  // A tie that takes you and a rival to the line together is yours: you finish on your own pick.
  const result = positions[0] >= cfg.target ? "won"
    : positions.some((p, i) => i > 0 && p >= cfg.target) ? "lost"
      : cfg.statIds.length - state.used.length - 1 <= 0 ? "lost" : null;
  return { state: { positions, used: [...state.used, statId], picks: [...state.picks, pick], result } };
}

/** 🟩 your nation moved, 🟥 only a rival moved, 🏁 / ❌ how it ended: the share line, with no stat or nation in it. */
export const shareLine = (state: SoloState) =>
  state.picks.map((p) => (p.leaders.includes(0) ? "🟩" : "🟥")).join("") + (state.result === "won" ? "🏁" : state.result === "lost" ? "❌" : "");

/** Same seed for everyone on the same day. */
export function daySeed(day: string): number {
  let h = 2166136261;
  for (const ch of day) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export const SOLO_TARGET = 5;
export const SOLO_RIVAL_MOVES = 3;

/** The day's race: a tournament (the big ones most often) and four balanced nations; the first is the player's. */
export function dailyRace(pack: RacePack, day: string): SoloConfig & { scopes: string[]; tournament?: string } {
  const deal = dealMatch(pack, 4, daySeed(day), { tournament: "random" });
  return { pack, racers: deal.racers, statIds: deal.statIds, target: SOLO_TARGET, rivalTarget: SOLO_RIVAL_MOVES, scopes: deal.scopes, tournament: deal.tournament };
}
