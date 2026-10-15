/** How long a game counts as new after its release. */
export const PLAY_NEW_DAYS = 21;
/** A game this fresh is never placed below the third card of its row, whatever its numbers are yet. */
export const PLAY_LAUNCH_DAYS = 7;
const LAUNCH_SLOTS = 3;

export interface PlayGameStats {
  /** Distinct real players (members and guests, no bots) in the last 7 days. */
  players7d: number;
  /** The same over the last 3 days: shows whether a game is rising or fading. */
  players3d: number;
}

export interface PlayRankRow {
  slug: string;
  score: number;
  popularity: number;
  novelty: number;
  momentum: number;
  ageDays: number | null;
  players7d: number;
  pinned: boolean;
}

const DAY_MS = 86_400_000;

/** Whole days since the release day; null when the game has no recorded release or is not out yet. */
export function playGameAgeDays(releasedOn: string | undefined, now: Date): number | null {
  if (!releasedOn) return null;
  const released = Date.parse(`${releasedOn}T00:00:00Z`);
  if (Number.isNaN(released) || released > now.getTime()) return null;
  return Math.floor((now.getTime() - released) / DAY_MS);
}

export function isNewPlayGame(releasedOn: string | undefined, now: Date): boolean {
  const age = playGameAgeDays(releasedOn, now);
  return age !== null && age < PLAY_NEW_DAYS;
}

/**
 * Orders one row of the Play page. Each game gets a score from three parts, all between 0 and 1:
 * - popularity (60 %): players in the last 7 days on a log scale against the row's busiest game, so one very
 *   large game does not flatten the differences between the others;
 * - novelty (25 %): 1 on release day, falling to 0 over PLAY_NEW_DAYS;
 * - momentum (15 %): the last 3 days' daily rate against the 7-day rate (0.5 = steady, above = rising).
 * Ties keep the curated order. Games in their first PLAY_LAUNCH_DAYS are then lifted into the first three cards.
 */
export function rankPlayGames(
  curated: readonly string[],
  stats: Readonly<Record<string, PlayGameStats | undefined>>,
  releases: Readonly<Record<string, string | undefined>>,
  now: Date,
): PlayRankRow[] {
  const busiest = Math.max(1, ...curated.map((slug) => stats[slug]?.players7d ?? 0));
  const rows = curated.map((slug, index) => {
    const players7d = stats[slug]?.players7d ?? 0;
    const players3d = stats[slug]?.players3d ?? 0;
    const ageDays = playGameAgeDays(releases[slug], now);
    const popularity = Math.log1p(players7d) / Math.log1p(busiest);
    const novelty = ageDays === null ? 0 : Math.max(0, 1 - ageDays / PLAY_NEW_DAYS);
    // A game younger than a week has no 7-day rate to compare with: it counts as steady.
    const settled = ageDays === null || ageDays >= 7;
    const ratio = settled && players7d > 0 ? (players3d / 3) / (players7d / 7) : 1;
    const momentum = Math.min(1, Math.max(0, ratio / 2));
    const score = 0.6 * popularity + 0.25 * novelty + 0.15 * momentum;
    return { slug, score, popularity, novelty, momentum, ageDays, players7d, pinned: ageDays !== null && ageDays < PLAY_LAUNCH_DAYS, index };
  });
  rows.sort((a, b) => b.score - a.score || a.index - b.index);
  const launched = rows.filter((row) => row.pinned).slice(0, LAUNCH_SLOTS);
  const rest = rows.filter((row) => !launched.includes(row));
  const head = rows.slice(0, LAUNCH_SLOTS).filter((row) => !launched.includes(row)).slice(0, LAUNCH_SLOTS - launched.length);
  // Launch games take their own places among the first three by score; the best of the rest fill what is left.
  const top = [...launched, ...head].sort((a, b) => b.score - a.score || a.index - b.index);
  return [...top, ...rest.filter((row) => !head.includes(row))].map(({ index: _index, ...row }) => row);
}
