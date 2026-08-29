import { describe, expect, it } from "vitest";

import type { MatchStatsSummary } from "@/lib/domain";
import type { RankedProfileResponse } from "@/lib/repositories/ranked.repo";
import { shouldShowProfileSeasonSelector } from "../profileSeasonControls";

function rankedProfile(
  overrides: Partial<RankedProfileResponse> = {},
): RankedProfileResponse {
  return {
    rp: 0,
    tier: "Academy",
    placementStatus: "unplaced",
    placementPlayed: 0,
    placementRequired: 3,
    placementWins: 0,
    currentWinStreak: 0,
    lastRankedMatchAt: null,
    ...overrides,
  };
}

function modeStats(gamesPlayed = 0) {
  return {
    gamesPlayed,
    wins: 0,
    losses: gamesPlayed,
    draws: 0,
    winRate: 0,
  };
}

function matchStats(overrides: Partial<MatchStatsSummary> = {}): MatchStatsSummary {
  return {
    overall: modeStats(),
    ranked: modeStats(),
    friendly: modeStats(),
    ...overrides,
  };
}

describe("shouldShowProfileSeasonSelector", () => {
  it("hides archived season controls for a first-login placement user", () => {
    expect(
      shouldShowProfileSeasonSelector({
        isSelf: true,
        archivedSeasonCount: 4,
        rankedProfile: rankedProfile(),
        rankedProfileLoading: false,
        matchStatsSummary: matchStats(),
      }),
    ).toBe(false);
  });

  it("shows controls after the user has a current ranked standing", () => {
    expect(
      shouldShowProfileSeasonSelector({
        isSelf: true,
        archivedSeasonCount: 1,
        rankedProfile: rankedProfile({
          rp: 1200,
          tier: "Reserve",
          placementStatus: "placed",
          placementPlayed: 3,
        }),
        rankedProfileLoading: false,
        matchStatsSummary: matchStats({ ranked: modeStats(3) }),
      }),
    ).toBe(true);
  });

  it("shows controls for a reset user with previous-season ranked history", () => {
    expect(
      shouldShowProfileSeasonSelector({
        isSelf: true,
        archivedSeasonCount: 1,
        rankedProfile: rankedProfile(),
        rankedProfileLoading: false,
        matchStatsSummary: matchStats({
          rankedSeasons: {
            current: modeStats(),
            previous: modeStats(8),
            currentSeasonNumber: 2,
            previousSeasonNumber: 1,
          },
        }),
      }),
    ).toBe(true);
  });
});
