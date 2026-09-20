import { describe, expect, it } from "vitest";
import { LEAGUE_LABELS, buildDemoDailySession, toSneakPeekSession } from "../demoDailySessions";
import type { DailyChallengeSession, DailyChallengeType } from "@/lib/domain/dailyChallenge";

const TYPES: DailyChallengeType[] = ["moneyDrop", "trueFalse", "clues", "countdown", "putInOrder", "imposter", "careerPath", "highLow", "footballLogic", "cardDetective", "missingXi", "passChain", "statSniper"];

/** The first piece of player-facing text a visitor reads in the sample. */
function firstText(session: DailyChallengeSession): string {
  switch (session.challengeType) {
    case "countdown": case "highLow": case "putInOrder": return session.rounds[0].prompt;
    case "clues": return session.questions[0].clues[0].content ?? "";
    case "missingXi": return session.description;
    case "passChain": return session.description;
    case "cardDetective": case "fifaCards": return session.description;
    default: return session.questions[0].prompt ?? "";
  }
}

describe("daily samples in every locale", () => {
  it.each(TYPES)("%s: Spanish and Turkish samples are localized, not English fallbacks", (type) => {
    const en = toSneakPeekSession(buildDemoDailySession(type, "en"));
    for (const locale of ["es", "tr"] as const) {
      const sample = toSneakPeekSession(buildDemoDailySession(type, locale));
      expect(sample.challengeType).toBe(type);
      expect(sample.description).not.toBe(en.description);
      expect(firstText(sample)).not.toBe(firstText(en));
    }
    const ka = toSneakPeekSession(buildDemoDailySession(type, "ka"));
    expect(firstText(ka)).not.toBe(firstText(en));
  });

  /** Hand-written fixtures: every display field, not just the first one. */
  it.each(["es", "tr", "ka"] as const)("%s: hand fixtures are fully localized", (locale) => {
    const en = buildDemoDailySession("footballLogic", "en");
    const logic = buildDemoDailySession("footballLogic", locale);
    if (logic.challengeType === "footballLogic" && en.challengeType === "footballLogic") {
      logic.questions.forEach((question, index) => {
        expect(question.prompt).not.toBe(en.questions[index].prompt);
        expect(question.explanation).not.toBe(en.questions[index].explanation);
        expect(question.category).not.toBe(en.questions[index].category);
      });
    }
    const sniperEn = buildDemoDailySession("statSniper", "en");
    const sniper = buildDemoDailySession("statSniper", locale);
    if (sniper.challengeType === "statSniper" && sniperEn.challengeType === "statSniper") {
      sniper.questions.forEach((question, index) => {
        expect(question.prompt).not.toBe(sniperEn.questions[index].prompt);
      });
    }
    const xiEn = buildDemoDailySession("missingXi", "en");
    const xi = buildDemoDailySession("missingXi", locale);
    if (xi.challengeType === "missingXi" && xiEn.challengeType === "missingXi") {
      xi.squads.forEach((squad, index) => expect(squad.matchLabel).not.toBe(xiEn.squads[index].matchLabel));
    }
    const cardsEn = buildDemoDailySession("cardDetective", "en");
    const cards = buildDemoDailySession("cardDetective", locale);
    if (cards.challengeType === "cardDetective" && cardsEn.challengeType === "cardDetective") {
      expect(cards.description).not.toBe(cardsEn.description);
      cards.cards.forEach((card, index) => {
        const expected = LEAGUE_LABELS[cardsEn.cards[index].league]?.[locale];
        if (expected) expect(card.league).toBe(expected);
      });
    }
  });
});
