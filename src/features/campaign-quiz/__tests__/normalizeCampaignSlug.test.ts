import { describe, expect, it } from "vitest";
import { normalizeCampaignSlug } from "../campaignQuiz.routes";

describe("normalizeCampaignSlug", () => {
  it("accepts canonical slugs", () => {
    expect(normalizeCampaignSlug("liverpool")).toEqual({ kind: "ok" });
    expect(normalizeCampaignSlug("club-badges-2")).toEqual({ kind: "ok" });
  });
  it("redirects case and whitespace variants of a valid slug", () => {
    expect(normalizeCampaignSlug("Liverpool")).toEqual({ kind: "redirect", slug: "liverpool" });
    expect(normalizeCampaignSlug("Club-Badges ")).toEqual({ kind: "redirect", slug: "club-badges" });
  });
  it("rejects everything else instead of asking the API", () => {
    for (const bad of ["liverpool_quiz", "-liverpool", "liverpool-", "a b", "", "quiz/1", "café"]) expect(normalizeCampaignSlug(bad)).toEqual({ kind: "invalid" });
  });
});
