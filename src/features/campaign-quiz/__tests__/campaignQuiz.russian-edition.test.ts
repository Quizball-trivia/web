import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({ getCampaignQuiz: vi.fn(), listCampaignQuizPages: vi.fn() }));
vi.mock("../campaignQuiz.api", () => api);
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NEXT_NOT_FOUND"); } }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

import { buildCampaignQuizMetadata, renderCampaignQuizPage } from "../CampaignQuizServerPage";

const quiz = (ru: boolean | undefined) => ({ page: null, ...(ru === undefined ? {} : { editions: { ka: false, es: true, ru } }) });

describe("Russian quiz editions", () => {
  beforeEach(() => {
    api.getCampaignQuiz.mockReset();
    api.listCampaignQuizPages.mockReset().mockRejectedValue(new Error("the catalog is not asked when the quiz says"));
  });

  it("links the Russian page only when the quiz has a Russian edition", async () => {
    api.getCampaignQuiz.mockImplementation(async (slug: string) => quiz(slug === "career-path"));
    const without = await buildCampaignQuizMetadata("liverpool", "en");
    const withRu = await buildCampaignQuizMetadata("career-path", "en");
    expect(without.alternates?.languages).not.toHaveProperty("ru");
    expect(withRu.alternates?.languages).toHaveProperty("ru", "https://quizball.io/ru/futbolnaya-viktorina/ugaday-futbolista-po-karere");
  });

  it("does not serve English under a Russian URL, even while the catalog is down", async () => {
    api.getCampaignQuiz.mockResolvedValue(quiz(false));
    await expect(renderCampaignQuizPage("liverpool", "ru")).rejects.toThrow("NEXT_NOT_FOUND");
    expect(await buildCampaignQuizMetadata("liverpool", "ru")).toEqual({});
  });

  it("an older backend: the catalog decides, and a catalog that cannot be read means no Russian page", async () => {
    api.getCampaignQuiz.mockResolvedValue(quiz(undefined));
    await expect(renderCampaignQuizPage("liverpool", "ru")).rejects.toThrow("NEXT_NOT_FOUND");
    api.listCampaignQuizPages.mockReset().mockResolvedValue([{ slug: "liverpool" }]);
    expect((await buildCampaignQuizMetadata("liverpool", "en")).alternates?.languages).toHaveProperty("ru");
  });

  it("a renamed quiz reaches the route's redirect: the quiz is asked for before the edition is checked", async () => {
    const missing = Object.assign(new Error("not found"), { status: 404 });
    api.getCampaignQuiz.mockRejectedValue(missing);
    await expect(renderCampaignQuizPage("old-slug", "ru")).rejects.toBe(missing);
  });
});
