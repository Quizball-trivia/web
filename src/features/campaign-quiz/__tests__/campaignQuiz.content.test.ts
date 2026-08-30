import { describe, expect, it } from "vitest";
import { CAMPAIGN_QUIZ_CONTENT } from "../campaignQuiz.content";

describe("campaign quiz fallback copy", () => {
  it("matches the current 10-question public quiz format", () => {
    const userFacingCopy = Object.values(CAMPAIGN_QUIZ_CONTENT)
      .flatMap((content) => [
        content.description,
        content.lede,
        ...content.aboutParagraphs,
      ])
      .join(" ");

    expect(userFacingCopy).not.toMatch(/\b15\b|fifteen/i);
    expect(CAMPAIGN_QUIZ_CONTENT["career-path"].description).toContain("10 verified transfer trails");
    expect(CAMPAIGN_QUIZ_CONTENT["club-badges"].description).toContain("10 verified questions");
  });
});
