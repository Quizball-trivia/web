import { rankPlayGames, isNewPlayGame, type PlayGameStats } from "./playRanking";

// The hand-made order: what the Play page shows when there are no numbers to order by, and how ties fall.
// Every slug resolves against ALL_DEMO_MODES; unknown slugs are simply skipped, so a rename can't crash the page.
export const DAILY_CHALLENGE_SLUGS = [
  "football-darts-501",
  "conexiones-futboleras",
  "tenable",
  "minuto",
  "shared-player",
  "name-chain",
  "football-horserace",
  "football-codenames",
  "dato-falso-futbolero",
  "buscaminas",
  "pistas",
  "daily-moneyDrop",
  "daily-countdown",
  "daily-careerPath",
  "daily-cardDetective",
  "lab-missing-xi",
  "daily-passChain",
  "mini-guess-the-goal",
  "daily-statSniper",
  // A quick warm-up rather than a headline game: it stays last.
  "daily-trueFalse",
];
export const PLAY_WITH_COINS_SLUGS = [
  "mini-final-third",
  "mini-squad-spin",
];

/**
 * Off the Play page per the 2026-11 game review; every route still opens directly (links, shares, rooms, partners).
 * - Cut: Road to Goal and Trivia Mines (chance outweighs knowledge), Higher or Lower (all-or-nothing rounds).
 * - Folded into a stronger game: Who Am I? (Football Clues), solo Last Answer Standing (Countdown; the friend
 *   room stays), Imposter (Odd One Out), Football Logic.
 */
export const RETIRED_PLAY_SLUGS = [
  "mini-road-to-goal",
  "mini-trivia-mines",
  "daily-highLow",
  "daily-clues",
  "ultimo",
  "daily-imposter",
  "daily-footballLogic",
];

/** The day each game reached production. A game with no date is never marked new. Add a line with every release. */
export const PLAY_RELEASED_ON: Record<string, string> = {
  "football-darts-501": "2026-10-30",
  "conexiones-futboleras": "2026-10-26",
  "football-codenames": "2026-10-22",
  "dato-falso-futbolero": "2026-10-19",
  tenable: "2026-10-16",
  "football-horserace": "2026-10-17",
  "shared-player": "2026-10-09",
  "name-chain": "2026-10-09",
  minuto: "2026-10-04",
  ultimo: "2026-09-30",
  pistas: "2026-09-29",
  buscaminas: "2026-09-28",
};

/** The backend's name for a card's game in its players-per-game counts, where it differs from `daily:<type>`. */
const POPULARITY_KEY: Record<string, string> = {
  "lab-missing-xi": "daily:missingXi",
  "mini-guess-the-goal": "guess-the-goal",
  "mini-trivia-mines": "trivia-mines",
  "mini-final-third": "free-kicks",
  "mini-road-to-goal": "road-to-goal",
  "mini-squad-spin": "squad-spin",
};
export const playPopularityKey = (slug: string): string =>
  POPULARITY_KEY[slug] ?? (slug.startsWith("daily-") ? `daily:${slug.slice("daily-".length)}` : slug);

/** GET /api/v1/guest/play-popularity. */
export interface PlayPopularity {
  generated_at: string | null;
  games: Record<string, { players_7d: number; players_3d: number } | undefined>;
}

/**
 * The endpoint's answer, kept only where it is well formed. Null when nothing usable is left, so a broken or empty
 * answer is handled like a failed read (the numbers already held are not thrown away for it).
 */
export function parsePlayPopularity(body: unknown): PlayPopularity | null {
  if (typeof body !== "object" || body === null) return null;
  const { generated_at, games } = body as { generated_at?: unknown; games?: unknown };
  if (typeof games !== "object" || games === null || Array.isArray(games)) return null;
  const count = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0;
  const kept: PlayPopularity["games"] = {};
  for (const [key, row] of Object.entries(games as Record<string, unknown>)) {
    const { players_7d, players_3d } = (row ?? {}) as { players_7d?: unknown; players_3d?: unknown };
    if (count(players_7d) && count(players_3d)) kept[key] = { players_7d, players_3d };
  }
  if (Object.keys(kept).length === 0) return null;
  return { generated_at: typeof generated_at === "string" ? generated_at : null, games: kept };
}

/** What the Play page is drawn from: each row's order, and the games to mark as new. */
export interface PlayOrder {
  /** Null when there were no numbers for that row: it keeps its hand-made order. */
  daily: string[] | null;
  coins: string[] | null;
  newSlugs: string[];
}

export function playOrderFrom(popularity: PlayPopularity | null, now: Date): PlayOrder {
  const everySlug = [...DAILY_CHALLENGE_SLUGS, ...PLAY_WITH_COINS_SLUGS];
  const newSlugs = everySlug.filter((slug) => isNewPlayGame(PLAY_RELEASED_ON[slug], now));
  if (!popularity) return { daily: null, coins: null, newSlugs };
  const stats: Record<string, PlayGameStats> = {};
  for (const slug of everySlug) {
    const row = popularity.games[playPopularityKey(slug)];
    if (row) stats[slug] = { players7d: row.players_7d, players3d: row.players_3d };
  }
  // A row with no counts of its own is not reordered by release dates alone.
  const ranked = (slugs: string[]) =>
    slugs.some((slug) => stats[slug]) ? rankPlayGames(slugs, stats, PLAY_RELEASED_ON, now).map((row) => row.slug) : null;
  const daily = ranked(DAILY_CHALLENGE_SLUGS);
  return { daily: daily && pinLast(daily), coins: ranked(PLAY_WITH_COINS_SLUGS), newSlugs };
}

/** Warm-ups that stay at the end of their row whatever their numbers say. */
export const PINNED_LAST_SLUGS = ["daily-trueFalse"];

function pinLast(slugs: string[]): string[] {
  return [...slugs.filter((slug) => !PINNED_LAST_SLUGS.includes(slug)), ...slugs.filter((slug) => PINNED_LAST_SLUGS.includes(slug))];
}
