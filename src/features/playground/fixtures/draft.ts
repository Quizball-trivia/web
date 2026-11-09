import { rateSeason, rng, type ClubSeason, type DraftPlayer, type Era, type League, type Opponent, type Pos } from "@/features/draft/draft.rules";

/**
 * An invented football universe for the Football Draft prototype: five made-up leagues, made-up clubs and players,
 * generated from a seed. No real league, club, player or stat appears here (the repository is public; real squads live
 * only in the private content store).
 */
export const LEAGUES: League[] = [
  { id: "costa", name: "Costa League", short: "CL", teams: 20, games: 38 },
  { id: "sol", name: "Liga del Sol", short: "LS", teams: 20, games: 38 },
  { id: "nube", name: "Serie Nube", short: "SN", teams: 20, games: 38 },
  { id: "nord", name: "Nordliga", short: "NL", teams: 18, games: 34 },
  { id: "azur", name: "Ligue Azur", short: "LA", teams: 18, games: 34 },
];

const PLACES: Record<string, string[]> = {
  costa: ["Ashbourne", "Kelmoor", "Redwick", "Stanbury", "Holloway Vale", "Marlow Cross", "Penfield", "Dunmere", "Easton Rovers", "Crayford", "Westleigh", "Barrowby", "Fenwick", "Larkspur", "Oakhurst", "Thornbury", "Wexmouth", "Halbrook", "Coldharbour", "Ravenscar"],
  sol: ["Atlético Aurora", "Real Brisa", "Deportivo Nube", "Unión Corvento", "Sporting Valdemar", "Racing Lunaria", "CD Pradera", "Real Marisol", "Club Sierra Alba", "Atlético Calima", "UD Rocamar", "CF Tamarindo", "Real Olivar", "SD Puerto Gris", "CD Arenal", "Unión Cardón", "Racing Estela", "CF Almendro", "Deportivo Caliza", "UD Brezo"],
  nube: ["Virtus Collina", "Fiorenza Alta", "Sporting Lago", "Atletico Mareno", "Pro Vespera", "Unione Sabbia", "Real Cortile", "Audace Pianura", "Vigor Torrente", "Robur Ventosa", "Libertas Corvo", "Juventus Falco", "Ardor Fonte", "Fortitudo Riva", "Pro Selva", "Olimpia Grotta", "Aquila Bosco", "Vis Lucerna", "Folgore Arco", "Tenax Brina"],
  nord: ["FC Kaltental", "SV Birkenau", "Fortuna Lindholm", "TSV Morgenfeld", "Eintracht Haselbach", "VfR Steinwald", "Union Grünhaven", "SC Rabenau", "Borussia Talheim", "1. FC Wolkenberg", "SpVgg Eschenbach", "Dynamo Felsberg", "Viktoria Nordmark", "SG Ahornfeld", "Rot-Weiß Sandau", "Alemannia Brunn", "Germania Holtz", "Concordia Weiler"],
  azur: ["Olympique Valmont", "AS Clairmer", "Stade Rivelune", "FC Beaurocher", "RC Montfleuve", "SC Brumevent", "US Pierrefeu", "AJ Sablonne", "Racing Ventoux", "Stade Corbel", "FC Lisière", "Olympique Mirande", "AS Chanteloup", "EA Vermeil", "SM Roncière", "FC Gris-Nez", "US Blanchard", "Stade Orvault"],
};

const FIRST = ["Tomás", "Iker", "Bruno", "Nico", "Dante", "Lucas", "Mateo", "Julián", "Santi", "Álvaro", "Emi", "Fede", "Gael", "Hugo", "Ignacio", "Joaquín", "Rafa", "Marco", "Teo", "Luka", "Aitor", "Kenan", "Oskar", "Yannick", "Sami", "Elio", "Ruben", "Ilan", "Jonas", "Matías", "Nuno", "Pavel", "Levan", "Emre", "Arda", "Davit", "Callum", "Rhys", "Finn", "Ousmane"];
const LAST = ["Varelo", "Montañés", "Salcedal", "Arrizábal", "Ferrolo", "Oyarzábal", "Quirogal", "Brizuelo", "Peñalosa", "Castañar", "Luquín", "Ortuzar", "Maldonar", "Retamal", "Zubeldo", "Kallberg", "Dornhof", "Vescovi", "Lambrini", "Terracel", "Mourelle", "Delacroze", "Benkadi", "Sarević", "Okonde", "Haldane", "Pryceford", "Ashcombe", "Tavernier-Rull", "Kvirelashvi", "Demirkaya", "Yalçınar", "Brennholt", "Ferraudo", "Quenneville", "Abalde", "Sorriba", "Halloran", "Mbekele", "Novotar"];

export const ERA_YEARS: Record<Era, [number, number]> = { modern: [2004, 2025], legends: [1975, 2003], all: [1975, 2025] };
export const seasonLabel = (year: number) => `${year}/${String((year + 1) % 100).padStart(2, "0")}`;

const SHAPE: Pos[] = ["GK", "GK", "DEF", "DEF", "DEF", "DEF", "DEF", "DEF", "DEF", "MID", "MID", "MID", "MID", "MID", "MID", "MID", "FWD", "FWD", "FWD", "FWD", "FWD", "FWD"];
const ALT: Partial<Record<Pos, Pos>> = { DEF: "MID", MID: "FWD", FWD: "MID" };

/** One club's squad in one season, always the same for the same (league, club, year). */
export function clubSeason(leagueId: string, clubIdx: number, year: number): ClubSeason {
  const league = LEAGUES.find((l) => l.id === leagueId) ?? LEAGUES[0];
  const club = PLACES[league.id][clubIdx % PLACES[league.id].length];
  const r = rng(`${league.id}|${clubIdx}|${year}`);
  const tier = clubIdx < 4 ? 0.85 : clubIdx < 9 ? 0.6 : 0.35;
  const form = Math.max(0.05, Math.min(1, tier + (r() - 0.5) * 0.4));
  const finish = Math.max(1, Math.min(league.teams, Math.round((1 - form) * (league.teams - 1)) + 1));
  const used = new Set<string>();
  const players: DraftPlayer[] = SHAPE.map((pos, i) => {
    let name = "";
    do name = `${FIRST[Math.floor(r() * FIRST.length)]} ${LAST[Math.floor(r() * LAST.length)]}`; while (used.has(name));
    used.add(name);
    const starter = i === 0 || (i >= 2 && i < 6) || (i >= 9 && i < 12) || (i >= 16 && i < 19) || r() < 0.15;
    const minutesShare = starter ? 0.62 + r() * 0.36 : 0.08 + r() * 0.4;
    const apps = Math.round(league.games * Math.min(1, minutesShare + 0.12));
    const talent = (starter ? 0.55 : 0.25) + form * 0.35 + (r() - 0.5) * 0.3;
    const goals = pos === "FWD" ? Math.round(talent * 26 * minutesShare) : pos === "MID" ? Math.round(talent * 11 * minutesShare) : pos === "DEF" ? Math.round(r() * 4 * minutesShare) : 0;
    const assists = pos === "GK" ? 0 : Math.round(talent * (pos === "MID" ? 12 : pos === "FWD" ? 9 : 4) * minutesShare);
    const cleanSheets = pos === "GK" || pos === "DEF" ? Math.round(apps * (0.15 + form * 0.35)) : 0;
    const rating = rateSeason({ pos, minutesShare, apps, goals, assists, cleanSheets, finish, teams: league.teams }).total;
    const alt = pos !== "GK" && r() < 0.3 ? [ALT[pos]!] : undefined;
    return { id: `${league.id}-${clubIdx}-${year}-${i}`, name, pos, alt, rating, apps, goals, assists, cleanSheets, minutesShare: Math.round(minutesShare * 100) / 100 };
  });
  return { id: `${league.id}-${clubIdx}-${year}`, clubId: `${league.id}-${clubIdx}`, club, season: seasonLabel(year), leagueId: league.id, legend: year < 2004, finish, players };
}

/** The spin: a club not used yet in this draft, a season in the era. */
export function spinFrom(leagueId: string, era: Era, seed: string, used: readonly string[]): ClubSeason {
  const league = LEAGUES.find((l) => l.id === leagueId) ?? LEAGUES[0];
  const r = rng(seed);
  const [from, to] = ERA_YEARS[era];
  const free = Array.from({ length: league.teams }, (_, i) => i).filter((i) => !used.includes(`${league.id}-${i}`));
  const clubIdx = free[Math.floor(r() * free.length)] ?? 0;
  return clubSeason(league.id, clubIdx, from + Math.floor(r() * (to - from + 1)));
}

/** Another invented club in the same year. */
export function otherClubOf(club: ClubSeason, _era: Era, seed: string, used: readonly string[]): ClubSeason {
  const league = LEAGUES.find((l) => l.id === club.leagueId) ?? LEAGUES[0];
  const free = Array.from({ length: league.teams }, (_, i) => i).filter((i) => !used.includes(`${league.id}-${i}`) && `${league.id}-${i}` !== club.clubId);
  const idx = free[Math.floor(rng(seed)() * free.length)] ?? 0;
  return clubSeason(league.id, idx, Number(club.season.slice(0, 4)));
}

/** The same invented club in another year of the era. */
export function otherSeasonOf(club: ClubSeason, era: Era, seed: string): ClubSeason {
  const [from, to] = ERA_YEARS[era];
  const clubIdx = Number(club.clubId.split("-").pop());
  const r = rng(seed);
  let next = clubSeason(club.leagueId, clubIdx, from + Math.floor(r() * (to - from + 1)));
  while (next.season === club.season) next = clubSeason(club.leagueId, clubIdx, from + Math.floor(r() * (to - from + 1)));
  return next;
}

/** The rest of the league the XI plays a season against. */
export function opponents(leagueId: string, seed: string): Opponent[] {
  const league = LEAGUES.find((l) => l.id === leagueId) ?? LEAGUES[0];
  const r = rng(`opp|${leagueId}|${seed}`);
  return PLACES[league.id].slice(0, league.teams - 1).map((name, i) => {
    const strength = Math.round((84 - (i * 15) / (league.teams - 2) + (r() - 0.5) * 2) * 10) / 10;
    const line = () => Math.round((strength + (r() - 0.5) * 6) * 10) / 10;
    return { id: `${league.id}-${i}`, name, strength, gk: line(), def: line(), mid: line(), att: line() };
  });
}

export const RIVAL_NAMES = ["Rival Inventado 4821", "Gaffer_Nube", "Brisa77", "TikiTaka_Teo", "Kallberg Fan", "Zubeldo10"];
