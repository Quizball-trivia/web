import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("listCampaignQuizPagesResilient", () => {
  const fetchSpy = vi.fn();
  beforeEach(() => { vi.stubGlobal("fetch", fetchSpy); fetchSpy.mockReset(); });
  afterEach(() => { vi.unstubAllGlobals(); });
  const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body });
  const pages = [{ slug: "liverpool", updated_at: "2026-09-01T00:00:00Z" }];

  it("uses the 5-minute catalog when it works and keeps the daily twin entry warm", async () => {
    fetchSpy.mockResolvedValue(ok(pages));
    const { listCampaignQuizPagesResilient } = await import("../campaignQuiz.api");
    expect(await listCampaignQuizPagesResilient("en")).toEqual(pages);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    const urls = fetchSpy.mock.calls.map((c) => String(c[0]));
    expect(urls.some((u) => u.includes("lkg=1"))).toBe(true);
    expect(fetchSpy.mock.calls.find((c) => String(c[0]).includes("lkg=1"))?.[1]).toMatchObject({ next: { revalidate: 86_400 } });
  });

  it("falls back to the daily last-known-good entry when the live catalog fails", async () => {
    fetchSpy.mockImplementation(async (url: string) => { if (String(url).includes("lkg=1")) return ok(pages); throw new Error("api down"); });
    const { listCampaignQuizPagesResilient } = await import("../campaignQuiz.api");
    expect(await listCampaignQuizPagesResilient("en")).toEqual(pages);
  });

  it("throws (instead of returning an empty catalog) when both are unavailable", async () => {
    fetchSpy.mockImplementation(async (url: string) => { throw new Error(String(url).includes("lkg=1") ? "still down" : "api down"); });
    const { listCampaignQuizPagesResilient } = await import("../campaignQuiz.api");
    await expect(listCampaignQuizPagesResilient("en")).rejects.toThrow("api down");
  });
});
