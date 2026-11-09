import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => {
  class CampaignQuizApiError extends Error {
    constructor(public status: number) { super(`status ${status}`); }
  }
  return { getCampaignQuiz: vi.fn(), listCampaignQuizPages: vi.fn(), CampaignQuizApiError };
});
vi.mock("../campaignQuiz.api", () => api);
vi.mock("next/navigation", () => ({
  notFound: () => { throw new Error("NEXT_NOT_FOUND"); },
  redirect: (path: string) => { throw new Error(`NEXT_REDIRECT ${path}`); },
}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

import { buildCampaignQuizMetadata, campaignOpenSlugs, renderCampaignQuizPage } from "../CampaignQuizServerPage";
import { CAMPAIGN_QUIZ_SLUGS, getCampaignQuizContent } from "../campaignQuiz.content";
import { CAMPAIGN_SLUG_MAX_LENGTH, CAMPAIGN_SLUG_PATTERN, campaignPublicSlug, campaignQuizPath, campaignSourceSlug, swapCampaignLocalePath } from "../campaignQuiz.routes";

const page = {
  category: "team", h1: "Quiz Northwick Rovers : teste tes connaissances", lede: "Dix questions.", about_heading: "À propos du quiz",
  about_blocks: [], score_cta: "{score}/{total} bonnes réponses.", footer_banner_text: "Joue.", footer_button_label: "Jouer en classé",
  hero_image_url: "/categories/northwick.webp", hero_image_alt: "Northwick Rovers", seo_title: "Quiz Northwick Rovers : 10 questions | QuizBall",
  meta_description: "Quiz foot Northwick Rovers, gratuit.", og_image_url: null, og_image_alt: null, breadcrumb_label: "Quiz Northwick Rovers",
  locale_mode: "en_only", ka_seo_title: null, ka_meta_description: null, ka_h1: null, ka_lede: null, related_pages: [],
  updated_at: "2026-11-06T00:00:00.000Z",
};
const quiz = (fr: boolean | undefined) => ({
  slug: "arsenal", title: "Quiz Northwick Rovers", total_questions: 0, questions: [], rating: { average: null, count: 0 }, page,
  editions: { ka: false, es: true, ru: false, pt: false, de: false, tr: false, ...(fr === undefined ? {} : { fr }) },
});

describe("French quiz editions", () => {
  beforeEach(() => {
    api.getCampaignQuiz.mockReset();
    api.listCampaignQuizPages.mockReset().mockRejectedValue(new Error("the catalog is not asked when the quiz says"));
  });

  it("gives every campaign quiz a valid French slug and a way back", () => {
    for (const source of CAMPAIGN_QUIZ_SLUGS) {
      const slug = campaignPublicSlug(source, "fr");
      expect(slug, source).toMatch(CAMPAIGN_SLUG_PATTERN);
      expect(slug.length).toBeLessThanOrEqual(CAMPAIGN_SLUG_MAX_LENGTH);
      expect(campaignSourceSlug(slug, "fr")).toBe(source);
    }
    expect(campaignQuizPath("barcelona", "fr")).toBe("/fr/quiz-foot/quiz-fc-barcelone");
    expect(campaignQuizPath("spain", "fr")).toBe("/fr/quiz-foot/quiz-espagne-foot");
    expect(campaignQuizPath("club-badges", "fr")).toBe("/fr/quiz-foot/quiz-logo-foot");
    expect(campaignQuizPath("career-path", "fr")).toBe("/fr/quiz-foot/devine-le-joueur-avec-les-clubs");
    expect(swapCampaignLocalePath("/fr/quiz-foot/quiz-fc-barcelone", "de")).toBe("/de/fussball-quiz/fc-barcelona-quiz");
    expect(swapCampaignLocalePath("/en/football-quiz", "fr")).toBe("/fr/quiz-foot");
  });

  it("announces the fr page only when the quiz has that edition", async () => {
    api.getCampaignQuiz.mockImplementation(async (slug: string) => quiz(slug === "arsenal"));
    const withFr = await buildCampaignQuizMetadata("arsenal", "en");
    expect(withFr.alternates?.languages).toHaveProperty("fr", "https://quizball.io/fr/quiz-foot/quiz-arsenal");
    expect(withFr.openGraph).toMatchObject({ alternateLocale: expect.arrayContaining(["fr_FR"]) });
    const without = await buildCampaignQuizMetadata("liverpool", "en");
    expect(without.alternates?.languages).not.toHaveProperty("fr");
  });

  it("serves the fr page with its own canonical, og locale and SEO title", async () => {
    api.getCampaignQuiz.mockResolvedValue(quiz(true));
    const metadata = await buildCampaignQuizMetadata("arsenal", "fr");
    expect(metadata.alternates?.canonical).toBe("https://quizball.io/fr/quiz-foot/quiz-arsenal");
    expect(metadata.openGraph).toMatchObject({ locale: "fr_FR" });
    expect(metadata.title).toEqual({ absolute: page.seo_title });
    expect(api.getCampaignQuiz).toHaveBeenCalledWith("arsenal", undefined, "fr");
  });

  it("sends a closed French page to the English quiz, never a 404 or English under a French address", async () => {
    api.getCampaignQuiz.mockResolvedValue(quiz(false));
    await expect(renderCampaignQuizPage("arsenal", "fr")).rejects.toThrow("NEXT_REDIRECT /en/football-quiz/arsenal");
    expect(await buildCampaignQuizMetadata("arsenal", "fr")).toEqual({});
  });

  it("a backend that does not know fr yet: the catalog decides, and a rejected one closes the edition", async () => {
    api.getCampaignQuiz.mockResolvedValue(quiz(undefined));
    await expect(renderCampaignQuizPage("arsenal", "fr")).rejects.toThrow("NEXT_REDIRECT /en/football-quiz/arsenal");
    for (const status of [400, 422]) {
      api.getCampaignQuiz.mockRejectedValue(new api.CampaignQuizApiError(status));
      await expect(renderCampaignQuizPage("arsenal", "fr")).rejects.toThrow("NEXT_REDIRECT /en/football-quiz/arsenal");
    }
    expect(await buildCampaignQuizMetadata("arsenal", "fr")).toEqual({});
  });

  it("links only to quizzes whose edition is open", async () => {
    api.listCampaignQuizPages.mockReset().mockImplementation(async (locale: string) => (locale === "fr" ? [{ slug: "arsenal" }] : []));
    expect(await campaignOpenSlugs("fr")).toEqual(new Set(["arsenal"]));
  });

  it("gives a French page its own play heading and about label", () => {
    const content = getCampaignQuizContent("arsenal", page as never, "fr");
    expect(content?.playHeading).toBe("Quiz Northwick Rovers : c’est parti");
    expect(content?.aboutEyebrow).toBe("L’histoire derrière les questions");
  });
});
