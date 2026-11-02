import { describe, expect, it } from "vitest";
import {
  BASE_ANSWER_S,
  FREE_READ_CHARS,
  MAX_ANSWER_S,
  READ_CHARS_PER_SECOND,
  answerSecondsForChars,
  answerSecondsForQuestion,
  liveAnswerSeconds,
} from "../freeKicksTiming";

describe("free kicks answer timing", () => {
  it("keeps 10s for short questions", () => {
    expect(answerSecondsForChars(0)).toBe(BASE_ANSWER_S);
    expect(answerSecondsForChars(FREE_READ_CHARS)).toBe(BASE_ANSWER_S);
    expect(answerSecondsForQuestion("Who won 2010?", ["Spain", "Italy", "Brazil", "France"])).toBe(BASE_ANSWER_S);
  });

  it("adds reading time for long questions, capped", () => {
    expect(answerSecondsForChars(FREE_READ_CHARS + 1)).toBe(BASE_ANSWER_S + 1);
    expect(answerSecondsForChars(FREE_READ_CHARS + READ_CHARS_PER_SECOND + 1)).toBe(BASE_ANSWER_S + 2);
    expect(answerSecondsForChars(5_000)).toBe(MAX_ANSWER_S);
    const long = "Which club did this player join after leaving his boyhood team, where he went on to win two league titles and a domestic cup before moving abroad?";
    const seconds = answerSecondsForQuestion(long, ["Borussia Dortmund", "Bayer Leverkusen", "Eintracht Frankfurt", "VfB Stuttgart"]);
    expect(seconds).toBeGreaterThan(BASE_ANSWER_S);
    expect(seconds).toBeLessThanOrEqual(MAX_ANSWER_S);
  });

  it("uses the server limit when present and falls back to 10s for older servers", () => {
    expect(liveAnswerSeconds(14_000)).toBe(14);
    expect(liveAnswerSeconds(undefined)).toBe(BASE_ANSWER_S);
    expect(liveAnswerSeconds(null)).toBe(BASE_ANSWER_S);
    expect(liveAnswerSeconds(0)).toBe(BASE_ANSWER_S);
    expect(liveAnswerSeconds(60_000)).toBe(MAX_ANSWER_S);
  });
});
