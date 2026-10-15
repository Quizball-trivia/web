import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({ getCampaignQuiz: vi.fn(), listCampaignQuizPages: vi.fn() }));
vi.mock("../campaignQuiz.api", () => api);
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NEXT_NOT_FOUND"); } }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

import { buildCampaignQuizMetadata, renderCampaignQuizPage } from "../CampaignQuizServerPage";

describe("Russian quiz editions", () => {
  beforeEach(() => {
    api.getCampaignQuiz.mockReset().mockResolvedValue({ page: null });
    api.listCampaignQuizPages.mockReset();
  });

  it("links the Russian page only when the Russian catalog has it", async () => {
    api.listCampaignQuizPages.mockResolvedValue([{ slug: "career-path" }]);
    const without = await buildCampaignQuizMetadata("liverpool", "en");
    const withRu = await buildCampaignQuizMetadata("career-path", "en");
    expect(without.alternates?.languages).not.toHaveProperty("ru");
    expect(withRu.alternates?.languages).toHaveProperty("ru", "https://quizball.io/ru/futbolnaya-viktorina/ugaday-futbolista-po-karere");
  });

  it("does not serve English under a Russian URL", async () => {
    api.listCampaignQuizPages.mockResolvedValue([]);
    await expect(renderCampaignQuizPage("liverpool", "ru")).rejects.toThrow("NEXT_NOT_FOUND");
    expect(await buildCampaignQuizMetadata("liverpool", "ru")).toEqual({});
    expect(api.getCampaignQuiz).not.toHaveBeenCalled();
  });

  it("keeps the Russian page when the catalog cannot be read", async () => {
    api.listCampaignQuizPages.mockRejectedValue(new Error("down"));
    const metadata = await buildCampaignQuizMetadata("liverpool", "ru");
    expect(metadata.alternates?.canonical).toMatch(/\/ru\/futbolnaya-viktorina\//);
  });
});
