import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";

function routeLookup(route: { kind: string; target_slug?: string }) {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify(route), { status: 200, headers: { "Content-Type": "application/json" } }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("retired and renamed quiz pages", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("answers a retired Russian quiz with 410, looked up by its English source slug", async () => {
    const fetchMock = routeLookup({ kind: "gone" });
    const response = await middleware(new NextRequest("https://quizball.io/ru/futbolnaya-viktorina/ugaday-klub-po-embleme"));
    expect(response.status).toBe(410);
    expect(String((fetchMock.mock.calls[0] as unknown[])[0])).toMatch(/\/campaign-quizzes\/routes\/club-badges$/);
  });

  it("moves a renamed Russian quiz to the Russian page of its new slug", async () => {
    routeLookup({ kind: "redirect", target_slug: "career-path" });
    const response = await middleware(new NextRequest("https://quizball.io/ru/futbolnaya-viktorina/ugaday-klub-po-embleme"));
    expect(response.status).toBe(301);
    expect(new URL(response.headers.get("location")!).pathname).toBe("/ru/futbolnaya-viktorina/ugaday-futbolista-po-karere");
  });

  it("keeps English redirects on the English folder", async () => {
    routeLookup({ kind: "redirect", target_slug: "career-path" });
    const response = await middleware(new NextRequest("https://quizball.io/en/football-quiz/club-badges"));
    expect(response.status).toBe(301);
    expect(new URL(response.headers.get("location")!).pathname).toBe("/en/football-quiz/career-path");
  });
});
