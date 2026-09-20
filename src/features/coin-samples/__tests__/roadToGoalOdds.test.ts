import { describe, expect, it } from "vitest";
import { ROAD_RULES, didSurvive, payoutForClearedZones, survivalOddsForZone, targetSurvivalBpForZone } from "../engines/roadToGoalOdds";

describe("Road to Goal sample odds (rules manifest v3)", () => {
  it("targets survival from the ladder: zone 1 = RTP/1.03, later zones = previous/next", () => {
    expect(targetSurvivalBpForZone(0)).toBe(Math.round((9_800 * 10_000) / 10_300));
    expect(targetSurvivalBpForZone(1)).toBe(Math.round((10_300 * 10_000) / 10_800));
    expect(targetSurvivalBpForZone(10)).toBe(Math.round((29_000 * 10_000) / 40_000));
  });
  it("keeps the skill gap and returns the target RTP against the zone's expected accuracy", () => {
    for (let zone = 0; zone < 11; zone += 1) {
      const odds = survivalOddsForZone(zone);
      expect(odds.correctSurvivalBp - odds.wrongSurvivalBp).toBe(odds.effectiveGapBp);
      expect(odds.effectiveGapBp).toBe(ROAD_RULES.desiredSkillGapBp);
      const weighted = (odds.expectedAccuracyBp * odds.correctSurvivalBp + (10_000 - odds.expectedAccuracyBp) * odds.wrongSurvivalBp) / 10_000;
      expect(Math.abs(weighted - odds.targetSurvivalBp)).toBeLessThanOrEqual(1);
      expect(odds.wrongSurvivalBp).toBeGreaterThanOrEqual(ROAD_RULES.minimumSurvivalBp);
      expect(odds.correctSurvivalBp).toBeLessThanOrEqual(ROAD_RULES.maximumSurvivalBp);
    }
  });
  it("pays hundredths exactly and rolls strictly below the odds", () => {
    expect(payoutForClearedZones(10, 1)).toBe(10.3);
    expect(payoutForClearedZones(25, 11)).toBe(100);
    expect(payoutForClearedZones(50, 0)).toBe(50);
    expect(didSurvive(4_999, 5_000)).toBe(true);
    expect(didSurvive(5_000, 5_000)).toBe(false);
  });
});
