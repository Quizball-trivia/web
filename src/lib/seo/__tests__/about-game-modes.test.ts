import { describe, expect, it } from "vitest";
import { ABOUT_GAME_MODES_COPY } from "@/lib/seo/about-game-modes";

describe("localized About game-mode copy", () => {
  it.each(["en", "ka", "es"] as const)("documents the live modes in %s", (locale) => {
    expect(ABOUT_GAME_MODES_COPY[locale].modes.map((mode) => mode.id)).toEqual([
      "ranked",
      "friendly",
      "daily",
      "auction",
    ]);
  });

  it.each(["en", "ka", "es"] as const)("explains the three Ranked 1v1 stages in %s", (locale) => {
    expect(ABOUT_GAME_MODES_COPY[locale].rankedSteps).toHaveLength(3);
    expect(ABOUT_GAME_MODES_COPY[locale].rankedMeta).toBeTruthy();
  });
});
