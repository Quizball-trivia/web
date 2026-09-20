import { describe, expect, it } from "vitest";
import { buildDemoDailySession, toSneakPeekSession } from "../demoDailySessions";
import type { DailyChallengeType } from "@/lib/domain/dailyChallenge";

const TYPES: DailyChallengeType[] = ["moneyDrop", "trueFalse", "clues", "countdown", "putInOrder", "imposter", "careerPath", "highLow", "footballLogic", "cardDetective", "missingXi", "passChain", "statSniper"];

/** The unit each engine reports progress on, and the count field it reads. */
function units(session: ReturnType<typeof buildDemoDailySession>): { items: number; declared: number } {
  switch (session.challengeType) {
    case "countdown": case "highLow": case "putInOrder": return { items: session.rounds.length, declared: session.roundCount };
    case "missingXi": return { items: session.squads.length, declared: session.squadCount };
    case "passChain": return { items: session.puzzles.length, declared: session.puzzleCount };
    case "cardDetective": case "fifaCards": return { items: session.cards.length, declared: session.cardCount };
    default: return { items: session.questions.length, declared: session.questionCount };
  }
}

describe("toSneakPeekSession", () => {
  it.each(TYPES)("%s: shortens the bundled sample and keeps the declared count consistent", (type) => {
    const full = buildDemoDailySession(type, "en");
    const peek = toSneakPeekSession(full);
    const before = units(full);
    const after = units(peek);
    expect(after.items).toBeGreaterThan(0);
    expect(after.items).toBeLessThanOrEqual(before.items);
    expect(after.declared).toBe(after.items);
    expect(peek.challengeType).toBe(type);
  });

  it("is the same content every time (a fixed sample, not a shuffle)", () => {
    const a = toSneakPeekSession(buildDemoDailySession("trueFalse", "ka"));
    const b = toSneakPeekSession(buildDemoDailySession("trueFalse", "ka"));
    expect(a).toEqual(b);
  });
});
