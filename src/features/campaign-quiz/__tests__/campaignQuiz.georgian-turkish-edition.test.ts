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
import { getCampaignQuizContent } from "../campaignQuiz.content";

const page = {
  category: "team", h1: "Northwick Rovers Testi — Bilgini Ölç", lede: "On soru.", about_heading: "Test hakkında",
  about_blocks: [], score_cta: "{score}/{total} doğru.", footer_banner_text: "Oyna.", footer_button_label: "Sıralamalı Oyna",
  hero_image_url: "/categories/northwick.webp", hero_image_alt: "Northwick Rovers", seo_title: "Northwick Rovers Testi: Soruları Çöz | QuizBall",
  meta_description: "Northwick Rovers bilgi yarışması, ücretsiz.", og_image_url: null, og_image_alt: null, breadcrumb_label: "Northwick Rovers Testi",
  locale_mode: "en_only", ka_seo_title: null, ka_meta_description: null, ka_h1: null, ka_lede: null, related_pages: [],
  updated_at: "2026-11-06T00:00:00.000Z",
};
const quiz = (editions: { ka?: boolean; tr?: boolean; de?: boolean }, withPage = true) => ({
  slug: "arsenal", title: "Northwick Rovers Testi", total_questions: 0, questions: [], rating: { average: null, count: 0 },
  page: withPage ? page : null,
  editions: { ka: false, es: true, ru: false, pt: false, de: false, ...editions },
});

describe("Georgian and Turkish quiz editions", () => {
  beforeEach(() => {
    api.getCampaignQuiz.mockReset();
    api.listCampaignQuizPages.mockReset().mockRejectedValue(new Error("the catalog is not asked when the quiz says"));
  });

  it("announces a language only when the quiz has that edition", async () => {
    api.getCampaignQuiz.mockImplementation(async (slug: string) => quiz(slug === "arsenal" ? { ka: true, tr: true } : { tr: false }));
    const withBoth = await buildCampaignQuizMetadata("arsenal", "en");
    expect(withBoth.alternates?.languages).toMatchObject({
      ka: "https://quizball.io/ka/football-quiz/arsenal",
      tr: "https://quizball.io/tr/futbol-bilgi-yarismasi/arsenal-testi",
    });
    expect(withBoth.openGraph).toMatchObject({ alternateLocale: expect.arrayContaining(["ka_GE", "tr_TR"]) });

    const without = await buildCampaignQuizMetadata("liverpool", "en");
    expect(without.alternates?.languages).not.toHaveProperty("tr");
    expect(without.alternates?.languages).not.toHaveProperty("ka");
  });

  it("serves the tr page with its own canonical, og locale and the SEO title as written", async () => {
    api.getCampaignQuiz.mockResolvedValue(quiz({ tr: true }));
    const metadata = await buildCampaignQuizMetadata("arsenal", "tr");
    expect(metadata.alternates?.canonical).toBe("https://quizball.io/tr/futbol-bilgi-yarismasi/arsenal-testi");
    expect(metadata.openGraph).toMatchObject({ locale: "tr_TR" });
    expect(metadata.title).toEqual({ absolute: page.seo_title });
    expect(api.getCampaignQuiz).toHaveBeenCalledWith("arsenal", undefined, "tr");
  });

  it("sends a closed Turkish page to the English quiz", async () => {
    api.getCampaignQuiz.mockResolvedValue(quiz({ tr: false }));
    await expect(renderCampaignQuizPage("arsenal", "tr")).rejects.toThrow("NEXT_REDIRECT /en/football-quiz/arsenal");
    expect(await buildCampaignQuizMetadata("arsenal", "tr")).toEqual({});
  });

  it("still answers a closed German page with 404", async () => {
    api.getCampaignQuiz.mockResolvedValue(quiz({ de: false }));
    await expect(renderCampaignQuizPage("arsenal", "de")).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("a backend without tr: the tr catalog decides, and a rejected catalog closes the edition", async () => {
    api.getCampaignQuiz.mockResolvedValue(quiz({}));
    await expect(renderCampaignQuizPage("arsenal", "tr")).rejects.toThrow("NEXT_REDIRECT /en/football-quiz/arsenal");
    api.listCampaignQuizPages.mockReset().mockImplementation(async (locale: string) => (locale === "tr" ? [{ slug: "arsenal" }] : []));
    expect((await buildCampaignQuizMetadata("arsenal", "en")).alternates?.languages).toHaveProperty("tr");
  });

  it("a backend that rejects locale=tr closes the edition instead of throwing a server error", async () => {
    api.getCampaignQuiz.mockRejectedValue(new api.CampaignQuizApiError(400));
    await expect(renderCampaignQuizPage("arsenal", "tr")).rejects.toThrow("NEXT_REDIRECT /en/football-quiz/arsenal");
    expect(await buildCampaignQuizMetadata("arsenal", "tr")).toEqual({});
  });

  it("leaves other failures alone: a 404 goes to the route's rename lookup, an outage stays an error", async () => {
    api.getCampaignQuiz.mockRejectedValue(new api.CampaignQuizApiError(404));
    await expect(renderCampaignQuizPage("arsenal", "tr")).rejects.toMatchObject({ status: 404 });
    api.getCampaignQuiz.mockRejectedValue(new api.CampaignQuizApiError(503));
    await expect(renderCampaignQuizPage("arsenal", "tr")).rejects.toMatchObject({ status: 503 });
  });

  it("links only to quizzes whose edition is open, and to none when the catalog cannot say", async () => {
    api.listCampaignQuizPages.mockReset().mockImplementation(async (locale: string) => (locale === "tr" ? [{ slug: "arsenal" }] : []));
    expect(await campaignOpenSlugs("tr")).toEqual(new Set(["arsenal"]));
    expect(await campaignOpenSlugs("en")).toBeUndefined();
    api.listCampaignQuizPages.mockReset().mockRejectedValue(new Error("catalog down"));
    expect(await campaignOpenSlugs("ka")).toEqual(new Set());
    expect(await campaignOpenSlugs("es")).toBeUndefined();
  });

  it("gives a Turkish page its own play heading and about label", () => {
    const content = getCampaignQuizContent("arsenal", page as never, "tr");
    expect(content?.playHeading).toBe("Northwick Rovers Testi: Hemen Başla");
    expect(content?.aboutEyebrow).toBe("Soruların ardındaki hikâye");
  });
});
