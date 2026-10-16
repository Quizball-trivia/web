import type { AvatarCustomization } from "@/types/game";
import { standings, type EndReason, type EngineConfig, type EngineState, type Phase, type PickResult, type Standing } from "./race.engine";
import { toPublicStats, type L10n, type PublicStat, type RaceNation, type RacePack } from "./race.rules";

/** The wording a screen needs (labels, scopes, families, the source line): the pack without a single value. */
export type RaceWording = Omit<RacePack, "stats">;
export const toWording = (pack: RacePack): RaceWording => ({
  version: pack.version, cutoff: pack.cutoff, source: pack.source, real: pack.real, nations: pack.nations, scopes: pack.scopes, families: pack.families, metrics: pack.metrics,
  tournaments: pack.tournaments,
});

/** `avatar` is absent for a racer nobody plays (the daily's rival nations). */
export interface RaceSeatView {
  seat: number; name: string; avatar?: AvatarCustomization; nation: RaceNation; position: number; picked: boolean;
  /** A room seat whose player is away (still racing, picked for by the clock) or has left (out of the race). */
  status?: "away" | "left";
}

/**
 * What one seat's screen gets, built field by field: stat wording for the whole theme, values only for picks already
 * revealed. A pick still hidden (another seat's, or one later in the reveal order) never reaches the screen, and the
 * reveal's count is the number of picks made, never the number that will be shown (an instant finish cuts the list).
 */
export interface RaceView {
  /** The tournament this race is played in (packs with tournaments). */
  tournament: L10n | null;
  phase: Phase;
  round: number;
  target: number;
  finish: EngineConfig["finish"];
  suddenDeath: boolean;
  seats: RaceSeatView[];
  mySeat: number;
  myPick: string | null;
  scopes: string[];
  stats: PublicStat[];
  /** Every pick revealed so far in the match, oldest first. */
  history: PickResult[];
  /** The round being revealed: the pick on screen, whether its values are out yet, and how many picks the round has. */
  reveal: { item: PickResult; index: number; total: number; open: boolean } | null;
  standings: Standing[] | null;
  winners: number[] | null;
  /** `left`: everyone else left the room. */
  endedBy: EndReason | "left" | null;
}

export function toRaceView(state: EngineState, cfg: EngineConfig, scopes: string[], people: Array<{ name: string; avatar: AvatarCustomization }>, mySeat: number): RaceView {
  const nationOf = new Map(cfg.pack.nations.map((n) => [n.id, n]));
  const current = state.phase === "reveal" && state.reveal ? state.reveal[state.revealIndex] ?? null : null;
  const shown = current ? state.revealIndex + (state.revealOpen ? 1 : 0) : 0;
  return {
    tournament: cfg.pack.tournaments?.find((t) => t.scopes.includes(scopes[0]))?.label ?? null,
    phase: state.phase, round: state.round, target: cfg.target, finish: cfg.finish, suddenDeath: state.suddenDeath, mySeat,
    seats: people.map((p, seat) => ({ seat, name: p.name, avatar: p.avatar, nation: nationOf.get(cfg.racers[seat])!, position: state.positions[seat], picked: state.picks[seat] !== null })),
    myPick: state.phase === "pick" ? state.picks[mySeat] : null,
    scopes, stats: toPublicStats(cfg.pack, cfg.statIds),
    history: [...state.rounds.flat(), ...(state.phase === "reveal" ? (state.reveal ?? []).slice(0, shown) : [])],
    reveal: current ? { item: state.revealOpen ? current : { ...current, values: [], leaders: [], details: [] }, index: state.revealIndex, total: state.revealPlanned, open: state.revealOpen } : null,
    standings: state.phase === "over" ? standings(state) : null,
    winners: state.winners,
    endedBy: state.endedBy,
  };
}
