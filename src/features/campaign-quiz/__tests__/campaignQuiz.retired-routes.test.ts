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
    const body = await response.text();
    expect(body).toContain('lang="ru"');
    expect(body).toContain("Эта викторина больше недоступна.");
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

  it("answers a retired Portuguese quiz with a pt-BR 410, looked up by its English source slug", async () => {
    const fetchMock = routeLookup({ kind: "gone" });
    const response = await middleware(new NextRequest("https://quizball.io/pt/quiz-de-futebol/adivinhe-o-time-pelo-escudo"));
    expect(response.status).toBe(410);
    expect(String((fetchMock.mock.calls[0] as unknown[])[0])).toMatch(/\/campaign-quizzes\/routes\/club-badges$/);
    const body = await response.text();
    expect(body).toContain('lang="pt-BR"');
    expect(body).toContain("Este quiz não está mais disponível.");
  });

  it("moves a renamed Portuguese quiz to the Portuguese page of its new slug", async () => {
    routeLookup({ kind: "redirect", target_slug: "career-path" });
    const response = await middleware(new NextRequest("https://quizball.io/pt/quiz-de-futebol/adivinhe-o-time-pelo-escudo"));
    expect(response.status).toBe(301);
    expect(new URL(response.headers.get("location")!).pathname).toBe("/pt/quiz-de-futebol/adivinhe-o-jogador-pela-carreira");
  });

  it("answers a retired German quiz with a de 410, looked up by its English source slug", async () => {
    const fetchMock = routeLookup({ kind: "gone" });
    const response = await middleware(new NextRequest("https://quizball.io/de/fussball-quiz/fussball-wappen-quiz"));
    expect(response.status).toBe(410);
    expect(String((fetchMock.mock.calls[0] as unknown[])[0])).toMatch(/\/campaign-quizzes\/routes\/club-badges$/);
    const body = await response.text();
    expect(body).toContain('lang="de"');
    expect(body).toContain("Dieses Quiz ist nicht mehr verfügbar.");
  });

  it("moves a renamed German quiz to the German page of its new slug", async () => {
    routeLookup({ kind: "redirect", target_slug: "career-path" });
    const response = await middleware(new NextRequest("https://quizball.io/de/fussball-quiz/fussball-wappen-quiz"));
    expect(response.status).toBe(301);
    expect(new URL(response.headers.get("location")!).pathname).toBe("/de/fussball-quiz/karrierestationen-erraten");
  });
});
