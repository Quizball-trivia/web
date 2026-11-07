import { FORMATIONS, lines, rateSeason, rng, type ClubSeason, type DraftPlayer, type Era, type League, type Lines, type Opponent, type Pos, type Role } from "@/features/draft/draft.rules";
import type { DraftUniverse } from "@/features/draft/draft.engine";
import { seasonLabel } from "./draft";

/**
 * Local-only real squads for the prototype: `public/dev-data/football-draft.json`, built from the private store
 * (`~/dev/quizball-private/football-draft/build_dev_pack.py`). The folder is gitignored; nothing real is in this repository.
 */
type RawPlayer = [name: string, pos: Pos, alt: Pos[] | null, apps: number, goals: number, assists: number | null, cleanSheets: number, startShare: number, personId: string, legend: number, role?: Role | null, estimated?: number];
interface RawClub { league: string; clubId: string; club: string; year: number; finish: number; players: RawPlayer[] }
export interface RealPack { source: string; leagues: League[]; clubs: RawClub[] }

export const REAL_PACK_URL = "/dev-data/football-draft.json";

export function realUniverse(pack: RealPack): DraftUniverse {
  const leagueOf = (id: string) => pack.leagues.find((l) => l.id === id) ?? pack.leagues[0];
  const toClubSeason = (c: RawClub): ClubSeason => {
    const league = leagueOf(c.league);
    const players: DraftPlayer[] = c.players.map(([name, pos, alt, apps, goals, assists, cleanSheets, minutesShare, personId, legend, role, estimated], i) => ({
      id: `${c.clubId}-${c.year}-${i}`, personId, legend: !!legend, name, pos, alt: alt ?? undefined, role: role ?? undefined, cleanSheetsEstimated: !!estimated, apps, goals, assists, cleanSheets, minutesShare,
      rating: rateSeason({ pos, minutesShare, apps, goals, assists, cleanSheets, finish: c.finish, teams: league.teams, legend: !!legend }).total,
    }));
    return { id: `${c.clubId}-${c.year}`, clubId: c.clubId, club: c.club, season: seasonLabel(c.year), leagueId: c.league, legend: c.year < 2004, finish: c.finish, players };
  };
  const rivals = new Map<string, Opponent[]>();
  const byLeague = new Map<string, RawClub[]>();
  for (const c of pack.clubs) byLeague.set(c.league, [...(byLeague.get(c.league) ?? []), c]);

  return {
    leagues: pack.leagues,
    spin: (leagueId: string, era: Era, seed: string, used: readonly string[]) => {
      const r = rng(seed);
      const all = byLeague.get(leagueId) ?? pack.clubs;
      const inEra = era === "modern" ? all.filter((c) => c.year >= 2004) : era === "legends" ? all.filter((c) => c.year < 2004) : all;
      const fresh = inEra.filter((c) => !used.includes(c.clubId));
      const pool = fresh.length ? fresh : inEra;
      return toClubSeason(pool[Math.floor(r() * pool.length)]);
    },
    otherClub: (club: ClubSeason, era: Era, seed: string, used: readonly string[]) => {
      const inEra = (byLeague.get(club.leagueId) ?? []).filter((c) => c.clubId !== club.clubId && (era === "all" || (era === "modern" ? c.year >= 2004 : c.year < 2004)));
      const fresh = inEra.filter((c) => !used.includes(c.clubId));
      const sameSeason = fresh.filter((c) => seasonLabel(c.year) === club.season);
      const pool = sameSeason.length ? sameSeason : fresh.length ? fresh : inEra;
      return pool.length ? toClubSeason(pool[Math.floor(rng(seed)() * pool.length)]) : null;
    },
    otherSeason: (club: ClubSeason, era: Era, seed: string) => {
      const others = (byLeague.get(club.leagueId) ?? []).filter((c) => c.clubId === club.clubId && seasonLabel(c.year) !== club.season && (era === "all" || (era === "modern" ? c.year >= 2004 : c.year < 2004)));
      return others.length ? toClubSeason(others[Math.floor(rng(seed)() * others.length)]) : null;
    },
    opponents: (leagueId: string): Opponent[] => {
      const known = rivals.get(leagueId);
      if (known) return known;
      const league = leagueOf(leagueId);
      const all = byLeague.get(leagueId) ?? [];
      // The latest finished season: a full table, and its busiest players played most of the games.
      const finished = (y: number) => { const cs = all.filter((c) => c.year === y); return cs.length >= league.teams && cs.every((c) => Math.max(...c.players.map((p) => p[3])) >= league.games * 0.8); };
      const latest = Math.max(...all.map((c) => c.year).filter(finished));
      // A rival's lines are its own best XI that season, rated the same way as the player's XI.
      const table = all.filter((c) => c.year === latest).map((c) => { const l = bestXi(toClubSeason(c)); return { id: c.clubId, name: c.club, strength: l.overall, gk: l.gk, def: l.def, mid: l.mid, att: l.att }; })
        .sort((a, b) => b.strength - a.strength).slice(0, league.teams - 1);
      rivals.set(leagueId, table);
      return table;
    },
  };
}

/** The best 4-3-3 a squad can field (top keeper, four defenders, three midfielders, three forwards). */
function bestXi(c: ClubSeason): Lines {
  const slots = FORMATIONS["4-3-3"];
  const left = c.players.slice().sort((a, b) => b.rating - a.rating);
  const picks = slots.map((slot) => {
    const i = left.findIndex((p) => p.pos === slot.pos);
    if (i < 0) return null;
    const [p] = left.splice(i, 1);
    return { slotId: slot.id, player: p, club: c.club, season: c.season, offPosition: false };
  });
  return lines(slots, picks);
}
