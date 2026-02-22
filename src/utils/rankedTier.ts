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

const RANKED_TIER_BANDS: Array<{ tier: RankedTier; minRp: number; maxRpExclusive: number | null }> = [
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
  if (rp >= 3200) return "GOAT";
  if (rp >= 2900) return "Legend";
  if (rp >= 2600) return "World-Class";
  if (rp >= 2200) return "Captain";
  if (rp >= 1850) return "Key Player";
  if (rp >= 1500) return "Starting11";
  if (rp >= 1200) return "Rotation";
  if (rp >= 900) return "Bench";
  if (rp >= 600) return "Reserve";
  if (rp >= 300) return "Youth Prospect";
  return "Academy";
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
