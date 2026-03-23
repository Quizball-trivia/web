export type RankedTier =
  | "Academy"
  | "Youth Prospect"
  | "Reserve"
  | "Bench"
  | "Rotation"
  | "Starting11"
  | "Key Player"
  | "Captain"
  | "World-Class"
  | "Legend"
  | "GOAT";

export interface RankedTierProgress {
  tier: RankedTier;
  minRp: number;
  maxRpExclusive: number | null;
  progress: number;
  pointsToNext: number | null;
}

export interface RankedTierBand {
  tier: RankedTier;
  minRp: number;
  maxRpExclusive: number | null;
}

export const RANKED_TIER_BANDS: RankedTierBand[] = [
  { tier: "GOAT", minRp: 3200, maxRpExclusive: null },
  { tier: "Legend", minRp: 2900, maxRpExclusive: 3200 },
  { tier: "World-Class", minRp: 2600, maxRpExclusive: 2900 },
  { tier: "Captain", minRp: 2200, maxRpExclusive: 2600 },
  { tier: "Key Player", minRp: 1850, maxRpExclusive: 2200 },
  { tier: "Starting11", minRp: 1500, maxRpExclusive: 1850 },
  { tier: "Rotation", minRp: 1200, maxRpExclusive: 1500 },
  { tier: "Bench", minRp: 900, maxRpExclusive: 1200 },
  { tier: "Reserve", minRp: 600, maxRpExclusive: 900 },
  { tier: "Youth Prospect", minRp: 300, maxRpExclusive: 600 },
  { tier: "Academy", minRp: 0, maxRpExclusive: 300 },
];

export function tierFromRp(rp: number): RankedTier {
  const band = RANKED_TIER_BANDS.find((entry) => rp >= entry.minRp);
  return band?.tier ?? "Academy";
}

export function getRankedTierProgress(rp: number): RankedTierProgress {
  const safeRp = Math.max(0, Math.floor(Number.isFinite(rp) ? rp : 0));
  const band = RANKED_TIER_BANDS.find((entry) => safeRp >= entry.minRp) ?? RANKED_TIER_BANDS[RANKED_TIER_BANDS.length - 1];

  if (band.maxRpExclusive === null) {
    return {
      tier: band.tier,
      minRp: band.minRp,
      maxRpExclusive: null,
      progress: 100,
      pointsToNext: null,
    };
  }

  const span = Math.max(1, band.maxRpExclusive - band.minRp);
  const inBand = Math.min(span, Math.max(0, safeRp - band.minRp));
  const progress = Math.round((inBand / span) * 100);
  const pointsToNext = Math.max(0, band.maxRpExclusive - safeRp);

  return {
    tier: band.tier,
    minRp: band.minRp,
    maxRpExclusive: band.maxRpExclusive,
    progress,
    pointsToNext,
  };
}

export function getNextTierBand(rp: number): RankedTierBand | null {
  const safeRp = Math.max(0, Math.floor(Number.isFinite(rp) ? rp : 0));
  const currentIndex = RANKED_TIER_BANDS.findIndex((entry) => safeRp >= entry.minRp);
  if (currentIndex <= 0) return null;
  return RANKED_TIER_BANDS[currentIndex - 1] ?? null;
}

export function getTiersRemainingToMax(rp: number): number {
  const safeRp = Math.max(0, Math.floor(Number.isFinite(rp) ? rp : 0));
  const currentIndex = RANKED_TIER_BANDS.findIndex((entry) => safeRp >= entry.minRp);
  if (currentIndex === -1) return RANKED_TIER_BANDS.length - 1;
  return currentIndex;
}

export function getRankedTierBandsAscending(): RankedTierBand[] {
  return [...RANKED_TIER_BANDS].reverse();
}
