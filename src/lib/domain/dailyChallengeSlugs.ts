import type { DailyChallengeType } from "@/lib/domain/dailyChallenge";

/**
 * Public URL slugs for the daily challenges. The internal type (`moneyDrop`)
 * stays as the storage/API key; the slug is what players and search engines
 * see (`/daily/challenges/money-drop`, `/en/daily/money-drop`).
 */
export const DAILY_CHALLENGE_SLUGS: Record<DailyChallengeType, string> = {
  moneyDrop: "money-drop",
  trueFalse: "true-or-false-football",
  clues: "who-am-i",
  countdown: "countdown",
  putInOrder: "football-timeline",
  imposter: "imposter",
  careerPath: "career-path",
  highLow: "higher-or-lower",
  footballLogic: "football-logic",
  fifaCards: "guess-the-card",
  cardDetective: "card-detective",
  missingXi: "missing-xi",
  passChain: "pass-chain",
  statSniper: "stat-sniper",
};

const TYPE_BY_SLUG = new Map<string, DailyChallengeType>(
  (Object.entries(DAILY_CHALLENGE_SLUGS) as Array<[DailyChallengeType, string]>).map(
    ([type, slug]) => [slug, type],
  ),
);

export function dailyChallengeSlug(type: DailyChallengeType): string {
  return DAILY_CHALLENGE_SLUGS[type];
}

/** Accepts a public slug OR a legacy internal type (old links, bookmarks). */
export function resolveDailyChallengeType(value: string): DailyChallengeType | null {
  const bySlug = TYPE_BY_SLUG.get(value);
  if (bySlug) return bySlug;
  return value in DAILY_CHALLENGE_SLUGS ? (value as DailyChallengeType) : null;
}

/** Route into the actual game (auth-gated app route). */
export function dailyChallengePlayPath(type: DailyChallengeType): string {
  return `/daily/challenges/${DAILY_CHALLENGE_SLUGS[type]}`;
}
