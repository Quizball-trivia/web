/**
 * Road to Goal survival odds — the rules manifest v3 (road-to-goal.fairness.ts
 * on the backend) ported for the sample: every answer, right or wrong, is a
 * survival roll whose odds are solved from the multiplier ladder so the run
 * returns the target RTP against the zone's expected accuracy.
 */
const BASIS_POINTS = 10_000;
export const ROAD_RULES = {
  targetRtpBp: 9_800,
  desiredSkillGapBp: 1_000,
  minimumAccuracyBp: 3_500,
  maximumAccuracyBp: 9_500,
  minimumSurvivalBp: 50,
  maximumSurvivalBp: 9_950,
  multiplierLadderBp: [10_300, 10_800, 11_500, 12_400, 13_600, 15_200, 17_200, 19_800, 23_500, 29_000, 40_000],
  difficulties: ["easy", "easy", "easy", "easy", "medium", "medium", "medium", "medium", "hard", "hard", "hard"] as const,
  zoneAccuracyPriorsBp: [8_000, 8_042, 8_084, 8_126, 6_669, 6_713, 6_757, 6_802, 5_347, 5_393, 5_440],
} as const;
export const ROAD_STAKES = [10, 25, 50] as const;
export const ROAD_ZONES = 11;
export const ROAD_QUESTION_MS = 15_000;
/** An open decision auto-banks after this long. */
export const ROAD_DECISION_MS = 300_000;

function roundedRatioBp(numeratorBp: number, denominatorBp: number): number {
  return Math.round((numeratorBp * BASIS_POINTS) / denominatorBp);
}
export function targetSurvivalBpForZone(zoneIndex: number, ladder: readonly number[] = ROAD_RULES.multiplierLadderBp, targetRtpBp = ROAD_RULES.targetRtpBp): number {
  const numeratorBp = zoneIndex === 0 ? targetRtpBp : ladder[zoneIndex - 1];
  return roundedRatioBp(numeratorBp, ladder[zoneIndex]);
}
function closestBoundedOdds(targetSurvivalBp: number, expectedAccuracyBp: number, gapBp: number, minimumSurvivalBp: number, maximumSurvivalBp: number) {
  const idealWrongNumerator = targetSurvivalBp * BASIS_POINTS - expectedAccuracyBp * gapBp;
  const lowerWrongBp = Math.floor(idealWrongNumerator / BASIS_POINTS);
  let closest: { correctSurvivalBp: number; wrongSurvivalBp: number; error: number } | null = null;
  for (const wrongSurvivalBp of [lowerWrongBp, lowerWrongBp + 1]) {
    const correctSurvivalBp = wrongSurvivalBp + gapBp;
    if (wrongSurvivalBp < minimumSurvivalBp || correctSurvivalBp > maximumSurvivalBp) continue;
    const weighted = expectedAccuracyBp * correctSurvivalBp + (BASIS_POINTS - expectedAccuracyBp) * wrongSurvivalBp;
    const error = Math.abs(weighted - targetSurvivalBp * BASIS_POINTS);
    if (closest == null || error < closest.error) closest = { correctSurvivalBp, wrongSurvivalBp, error };
  }
  return closest;
}
export interface RoadSurvivalOdds { expectedAccuracyBp: number; targetSurvivalBp: number; correctSurvivalBp: number; wrongSurvivalBp: number; effectiveGapBp: number }
export function survivalOddsForZone(zoneIndex: number, expectedAccuracyBp = ROAD_RULES.zoneAccuracyPriorsBp[zoneIndex]): RoadSurvivalOdds {
  const rules = ROAD_RULES;
  const accuracy = Math.min(rules.maximumAccuracyBp, Math.max(rules.minimumAccuracyBp, expectedAccuracyBp));
  const targetSurvivalBp = targetSurvivalBpForZone(zoneIndex);
  for (let gapBp = rules.desiredSkillGapBp; gapBp > 0; gapBp -= 1) {
    const odds = closestBoundedOdds(targetSurvivalBp, accuracy, gapBp, rules.minimumSurvivalBp, rules.maximumSurvivalBp);
    if (odds) return { expectedAccuracyBp: accuracy, targetSurvivalBp, correctSurvivalBp: odds.correctSurvivalBp, wrongSurvivalBp: odds.wrongSurvivalBp, effectiveGapBp: gapBp };
  }
  throw new RangeError("Unable to produce bounded survival odds");
}
/** Live: survived when the roll (0..9999) is below the applied survival odds. */
export function didSurvive(rollBp: number, appliedSurvivalBp: number): boolean {
  return rollBp < appliedSurvivalBp;
}
/** Exact payout in hundredths of a coin (live keeps two decimals). */
export function payoutMinorForClearedZones(stakeCoins: number, clearedZones: number): number {
  const multiplierBp = clearedZones === 0 ? BASIS_POINTS : ROAD_RULES.multiplierLadderBp[clearedZones - 1];
  return Math.floor((stakeCoins * 100 * multiplierBp) / BASIS_POINTS);
}
export function payoutForClearedZones(stakeCoins: number, clearedZones: number): number {
  return payoutMinorForClearedZones(stakeCoins, clearedZones) / 100;
}
