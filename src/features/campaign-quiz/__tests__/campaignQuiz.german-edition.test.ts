import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({ getCampaignQuiz: vi.fn(), listCampaignQuizPages: vi.fn() }));
vi.mock("../campaignQuiz.api", () => api);
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NEXT_NOT_FOUND"); } }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

import { buildCampaignQuizMetadata, renderCampaignQuizPage } from "../CampaignQuizServerPage";

const page = {
  category: "team", h1: "Arsenal-Quiz — teste dein Wissen", lede: "Zehn Fragen.", about_heading: "Über das Quiz",
  about_blocks: [], score_cta: "Du hast {score} von {total} richtig.", footer_banner_text: "Spiel mit.", footer_button_label: "Ranked spielen",
  hero_image_url: "/categories/arsenal.webp", hero_image_alt: "Arsenal", seo_title: "Arsenal-Quiz: 10 Fragen | QuizBall",
  meta_description: "Arsenal-Quiz online und kostenlos.", og_image_url: null, og_image_alt: null, breadcrumb_label: "Arsenal-Quiz",
  locale_mode: "en_only", ka_seo_title: null, ka_meta_description: null, ka_h1: null, ka_lede: null, related_pages: [],
  updated_at: "2026-10-23T00:00:00.000Z",
};
/** de undefined: a backend without German pages (its editions have no de key). */
const quiz = (de: boolean | undefined, withPage = false) => ({
  slug: "arsenal", title: "Arsenal-Quiz", total_questions: 0, questions: [], rating: { average: null, count: 0 },
  page: withPage ? page : null,
  editions: { ka: false, es: true, ru: false, pt: false, ...(de === undefined ? {} : { de }) },
});

describe("German quiz editions", () => {
  beforeEach(() => {
    api.getCampaignQuiz.mockReset();
    api.listCampaignQuizPages.mockReset().mockRejectedValue(new Error("the catalog is not asked when the quiz says"));
  });

  it("announces the de page only when the quiz has a de edition", async () => {
    api.getCampaignQuiz.mockImplementation(async (slug: string) => quiz(slug === "arsenal", true));
    const withDe = await buildCampaignQuizMetadata("arsenal", "en");
    expect(withDe.alternates?.languages).toHaveProperty("de", "https://quizball.io/de/fussball-quiz/arsenal-quiz");
    expect(withDe.openGraph).toMatchObject({ alternateLocale: expect.arrayContaining(["de_DE"]) });

    const without = await buildCampaignQuizMetadata("liverpool", "en");
    expect(without.alternates?.languages).not.toHaveProperty("de");
  });

  it("serves the de page with its own canonical, og locale and SEO title", async () => {
    api.getCampaignQuiz.mockResolvedValue(quiz(true, true));
    const metadata = await buildCampaignQuizMetadata("arsenal", "de");
    expect(metadata.alternates?.canonical).toBe("https://quizball.io/de/fussball-quiz/arsenal-quiz");
    expect(metadata.alternates?.languages).toHaveProperty("de", "https://quizball.io/de/fussball-quiz/arsenal-quiz");
    expect(metadata.openGraph).toMatchObject({ locale: "de_DE" });
    expect(api.getCampaignQuiz).toHaveBeenCalledWith("arsenal", undefined, "de");
  });

  it("does not serve English under a German URL", async () => {
    api.getCampaignQuiz.mockResolvedValue(quiz(false, true));
    await expect(renderCampaignQuizPage("arsenal", "de")).rejects.toThrow("NEXT_NOT_FOUND");
    expect(await buildCampaignQuizMetadata("arsenal", "de")).toEqual({});
  });

  it("a backend without de: the de catalog decides, and a rejected catalog means no de page", async () => {
    api.getCampaignQuiz.mockResolvedValue(quiz(undefined, true));
    await expect(renderCampaignQuizPage("arsenal", "de")).rejects.toThrow("NEXT_NOT_FOUND");
    expect((await buildCampaignQuizMetadata("arsenal", "en")).alternates?.languages).not.toHaveProperty("de");
    api.listCampaignQuizPages.mockReset().mockImplementation(async (locale: string) => (locale === "de" ? [{ slug: "arsenal" }] : []));
    expect((await buildCampaignQuizMetadata("arsenal", "en")).alternates?.languages).toHaveProperty("de");
  });

  it("a CMS preview renders under the German URL even before the edition is complete", async () => {
    api.getCampaignQuiz.mockResolvedValue(quiz(false, true));
    await expect(renderCampaignQuizPage("arsenal", "de", "de6bd11f-27ee-4721-9586-7f561bfd27e2")).resolves.toBeTruthy();
  });
});
