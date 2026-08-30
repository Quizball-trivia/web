import { describe, expect, it } from "vitest";
import {
  CAMPAIGN_QUIZ_CONTENT,
  campaignMetadataTitle,
} from "../campaignQuiz.content";

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

  it("keeps Spanish campaign titles concise and search-focused", () => {
    const title = campaignMetadataTitle(
      {
        breadcrumb_label: "Quiz sobre el Newcastle United",
        seo_title: "Quiz sobre el Newcastle United — Prueba de Conocimiento de los Magpies | QuizBall",
      },
      "es",
    );

    expect(title).toBe("Quiz sobre el Newcastle United — Juega gratis | QuizBall");
    expect(title.length).toBeLessThanOrEqual(60);
  });

  it("preserves stored titles for non-Spanish campaign pages", () => {
    expect(
      campaignMetadataTitle(
        { breadcrumb_label: "Liverpool Quiz", seo_title: "Liverpool Quiz | QuizBall" },
        "en",
      ),
    ).toBe("Liverpool Quiz | QuizBall");
  });
});
