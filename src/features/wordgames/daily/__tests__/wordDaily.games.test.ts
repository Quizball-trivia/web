import { describe, expect, it } from "vitest";
import { nameChainDailyCopy, sharedPlayerDailyCopy } from "../../copy";
import { nameChainDailyGame, sharedPlayerDailyGame } from "../wordDaily.games";

describe("lightweight word daily definitions", () => {
  for (const locale of ["en", "es", "ka", "tr"] as const) {
    it.each([[1, 10], [4, 10], [5, 20], [6, 20]])(
      `preserves the ${locale} shared-player clock for day %i`,
      (dayNumber, seconds) => {
        const game = sharedPlayerDailyGame(locale);
        expect(typeof game.lines).toBe("function");
        const lines = typeof game.lines === "function" ? game.lines(dayNumber) : game.lines;
        expect(lines).toEqual(sharedPlayerDailyCopy(locale).lines(seconds));
      },
    );

    it(`preserves the static ${locale} Name Chain rules`, () => {
      expect(nameChainDailyGame(locale).lines).toEqual(nameChainDailyCopy(locale).lines);
    });
  }
});
