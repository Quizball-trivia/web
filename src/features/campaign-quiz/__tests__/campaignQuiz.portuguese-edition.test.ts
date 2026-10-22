import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({ getCampaignQuiz: vi.fn(), listCampaignQuizPages: vi.fn() }));
vi.mock("../campaignQuiz.api", () => api);
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NEXT_NOT_FOUND"); } }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

import { buildCampaignQuizMetadata, renderCampaignQuizPage } from "../CampaignQuizServerPage";

const page = {
  category: "team", h1: "Quiz do Arsenal — teste seus conhecimentos", lede: "Dez perguntas.", about_heading: "Sobre",
  about_blocks: [], score_cta: "Você acertou {score} de {total}.", footer_banner_text: "Jogue.", footer_button_label: "Jogar no ranqueado",
  hero_image_url: "/categories/arsenal.webp", hero_image_alt: "Arsenal", seo_title: "Quiz do Arsenal: 10 perguntas | QuizBall",
  meta_description: "Quiz do Arsenal online e grátis.", og_image_url: null, og_image_alt: null, breadcrumb_label: "Quiz do Arsenal",
  locale_mode: "en_only", ka_seo_title: null, ka_meta_description: null, ka_h1: null, ka_lede: null, related_pages: [],
  updated_at: "2026-10-21T00:00:00.000Z",
};
/** pt undefined: a backend without Portuguese pages (its editions have no pt key). */
const quiz = (pt: boolean | undefined, withPage = false) => ({
  slug: "arsenal", title: "Quiz do Arsenal", total_questions: 0, questions: [], rating: { average: null, count: 0 },
  page: withPage ? page : null,
  editions: { ka: false, es: true, ru: false, ...(pt === undefined ? {} : { pt }) },
});

describe("Brazilian Portuguese quiz editions", () => {
  beforeEach(() => {
    api.getCampaignQuiz.mockReset();
    api.listCampaignQuizPages.mockReset().mockRejectedValue(new Error("the catalog is not asked when the quiz says"));
  });

  it("announces the pt page as pt-BR only when the quiz has a pt edition", async () => {
    api.getCampaignQuiz.mockImplementation(async (slug: string) => quiz(slug === "arsenal", true));
    const withPt = await buildCampaignQuizMetadata("arsenal", "en");
    expect(withPt.alternates?.languages).toHaveProperty("pt-BR", "https://quizball.io/pt/quiz-de-futebol/quiz-do-arsenal");
    expect(withPt.alternates?.languages).not.toHaveProperty("pt");
    expect(withPt.openGraph).toMatchObject({ alternateLocale: expect.arrayContaining(["pt_BR"]) });

    const without = await buildCampaignQuizMetadata("liverpool", "en");
    expect(without.alternates?.languages).not.toHaveProperty("pt-BR");
  });

  it("serves the pt page with its own canonical and og locale", async () => {
    api.getCampaignQuiz.mockResolvedValue(quiz(true, true));
    const metadata = await buildCampaignQuizMetadata("arsenal", "pt");
    expect(metadata.alternates?.canonical).toBe("https://quizball.io/pt/quiz-de-futebol/quiz-do-arsenal");
    expect(metadata.openGraph).toMatchObject({ locale: "pt_BR" });
    expect(metadata.title).toEqual({ absolute: "Quiz do Arsenal: 10 perguntas | QuizBall" });
    expect(api.getCampaignQuiz).toHaveBeenCalledWith("arsenal", undefined, "pt");
  });

  it("does not serve English under a Portuguese URL", async () => {
    api.getCampaignQuiz.mockResolvedValue(quiz(false, true));
    await expect(renderCampaignQuizPage("arsenal", "pt")).rejects.toThrow("NEXT_NOT_FOUND");
    expect(await buildCampaignQuizMetadata("arsenal", "pt")).toEqual({});
  });

  it("a backend without pt: the pt catalog decides, and a rejected catalog means no pt page", async () => {
    api.getCampaignQuiz.mockResolvedValue(quiz(undefined, true));
    await expect(renderCampaignQuizPage("arsenal", "pt")).rejects.toThrow("NEXT_NOT_FOUND");
    expect((await buildCampaignQuizMetadata("arsenal", "en")).alternates?.languages).not.toHaveProperty("pt-BR");
    api.listCampaignQuizPages.mockReset().mockResolvedValue([{ slug: "arsenal" }]);
    expect((await buildCampaignQuizMetadata("arsenal", "en")).alternates?.languages).toHaveProperty("pt-BR");
  });

  it("a CMS preview renders under the Portuguese URL even before the edition is complete", async () => {
    api.getCampaignQuiz.mockResolvedValue(quiz(false, true));
    await expect(renderCampaignQuizPage("arsenal", "pt", "de6bd11f-27ee-4721-9586-7f561bfd27e2")).resolves.toBeTruthy();
  });
});
