import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("listCampaignQuizPagesResilient", () => {
  const fetchSpy = vi.fn();
  beforeEach(() => { vi.stubGlobal("fetch", fetchSpy); fetchSpy.mockReset(); });
  afterEach(() => { vi.unstubAllGlobals(); });
  const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body });
  const pages = [{ slug: "liverpool", updated_at: "2026-09-01T00:00:00Z" }];

  it("uses the 5-minute catalog when it works", async () => {
    fetchSpy.mockResolvedValueOnce(ok(pages));
    const { listCampaignQuizPagesResilient } = await import("../campaignQuiz.api");
    expect(await listCampaignQuizPagesResilient("en")).toEqual(pages);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("falls back to the daily last-known-good entry when the live catalog fails", async () => {
    fetchSpy.mockRejectedValueOnce(new Error("api down")).mockResolvedValueOnce(ok(pages));
    const { listCampaignQuizPagesResilient } = await import("../campaignQuiz.api");
    expect(await listCampaignQuizPagesResilient("en")).toEqual(pages);
    expect(String(fetchSpy.mock.calls[1][0])).toContain("lkg=1");
    expect(fetchSpy.mock.calls[1][1]).toMatchObject({ next: { revalidate: 86_400 } });
  });

  it("throws (instead of returning an empty catalog) when both are unavailable", async () => {
    fetchSpy.mockRejectedValueOnce(new Error("api down")).mockRejectedValueOnce(new Error("still down"));
    const { listCampaignQuizPagesResilient } = await import("../campaignQuiz.api");
    await expect(listCampaignQuizPagesResilient("en")).rejects.toThrow("api down");
  });
});
