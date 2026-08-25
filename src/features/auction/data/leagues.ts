/**
 * League metadata for the auction chemistry UI.
 *
 * Leagues are one of the three chemistry dimensions (with club + nation). Every
 * current entry sets `logo`, which renders the real crest; the styled colour
 * badge (see LeagueLogo) is the fallback for any future league added without
 * an asset.
 */
import { getClub } from '@/lib/clubs';

export interface League {
  /** Canonical name, matched case-insensitively against a footballer's `league`. */
  name: string;
  /** Longer label for pills/rows (e.g. "La Liga"). */
  abbr: string;
  /** 2-char tag for the small square badge (e.g. "LL"). */
  short: string;
  /** Badge background colour. */
  color: string;
  /** Badge text colour (defaults to white). */
  textColor?: string;
  /** Country the league belongs to (used for grouping / a fallback flag). */
  country: string;
  /** Asset-ready: a real logo URL/path. When set, LeagueLogo renders it instead
   *  of the colour badge. */
  logo?: string;
}

export const LEAGUES: League[] = [
  { name: 'Premier League', abbr: 'Premier League', short: 'PL', color: '#360D3A', country: 'England', logo: 'https://media.api-sports.io/football/leagues/39.png' },
  { name: 'La Liga', abbr: 'La Liga', short: 'LL', color: '#E01A22', country: 'Spain', logo: 'https://media.api-sports.io/football/leagues/140.png' },
  { name: 'Serie A', abbr: 'Serie A', short: 'SA', color: '#0067B1', country: 'Italy', logo: 'https://media.api-sports.io/football/leagues/135.png' },
  { name: 'Bundesliga', abbr: 'Bundesliga', short: 'BL', color: '#D20515', country: 'Germany', logo: 'https://media.api-sports.io/football/leagues/78.png' },
  { name: 'Ligue 1', abbr: 'Ligue 1', short: 'L1', color: '#DAE025', textColor: '#0A1A3F', country: 'France', logo: 'https://media.api-sports.io/football/leagues/61.png' },
  { name: 'Eredivisie', abbr: 'Eredivisie', short: 'ER', color: '#E4002B', country: 'Netherlands', logo: 'https://media.api-sports.io/football/leagues/88.png' },
  { name: 'Primeira Liga', abbr: 'Primeira Liga', short: 'PT', color: '#006847', country: 'Portugal', logo: 'https://media.api-sports.io/football/leagues/94.png' },
  { name: 'Brasileirão', abbr: 'Brasileirão', short: 'BR', color: '#009C3B', textColor: '#FFDF00', country: 'Brazil', logo: 'https://media.api-sports.io/football/leagues/71.png' },
  { name: 'Scottish Premiership', abbr: 'Scottish Prem', short: 'SP', color: '#163A6B', country: 'Scotland', logo: 'https://media.api-sports.io/football/leagues/179.png' },
  { name: 'Primera División', abbr: 'Primera División', short: 'AR', color: '#75AADB', textColor: '#0A1A3F', country: 'Argentina', logo: 'https://media.api-sports.io/football/leagues/128.png' },
];

const byName = new Map<string, League>(LEAGUES.map((l) => [l.name.toLowerCase(), l]));
const byCountry = new Map<string, League>(LEAGUES.map((l) => [l.country.toLowerCase(), l]));

/** Resolve a league by name (case-insensitive). Returns null when unknown. */
export function getLeague(name?: string | null): League | null {
  if (!name) return null;
  return byName.get(name.toLowerCase()) ?? null;
}

/**
 * Display fallback for players with no explicit `league`: derive the top league
 * from the club's country (via getClub → country → league). Approximate — a
 * country can have several tiers — but it lets the league badge show for any
 * recognised club when the real league field isn't in the data yet. A real
 * `league` on the footballer always takes precedence over this.
 */
export function getLeagueForClub(club?: string | null): League | null {
  const resolved = getClub(club ?? null);
  if (!resolved) return null;
  return byCountry.get(resolved.country.toLowerCase()) ?? null;
}
