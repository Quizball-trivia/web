import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";

function routeLookup(route: { kind: string; slug?: string; target_slug?: string; public_slug?: string }) {
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
    expect(String((fetchMock.mock.calls[0] as unknown[])[0])).toMatch(/\/campaign-quizzes\/routes\/club-badges(\?|$)/);
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
    expect(String((fetchMock.mock.calls[0] as unknown[])[0])).toMatch(/\/campaign-quizzes\/routes\/club-badges(\?|$)/);
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
    expect(String((fetchMock.mock.calls[0] as unknown[])[0])).toMatch(/\/campaign-quizzes\/routes\/club-badges(\?|$)/);
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

  it("answers a retired Turkish quiz with a Turkish 410, looked up by its English source slug", async () => {
    const fetchMock = routeLookup({ kind: "gone" });
    const response = await middleware(new NextRequest("https://quizball.io/tr/futbol-bilgi-yarismasi/logodan-takim-bilme"));
    expect(response.status).toBe(410);
    expect(String((fetchMock.mock.calls[0] as unknown[])[0])).toMatch(/\/campaign-quizzes\/routes\/club-badges(\?|$)/);
    const body = await response.text();
    expect(body).toContain('lang="tr"');
    expect(body).toContain("Bu test artık kullanılamıyor.");
  });

  it("moves a renamed Turkish quiz to the Turkish page of its new slug", async () => {
    routeLookup({ kind: "redirect", target_slug: "career-path" });
    const response = await middleware(new NextRequest("https://quizball.io/tr/futbol-bilgi-yarismasi/logodan-takim-bilme"));
    expect(response.status).toBe(301);
    expect(new URL(response.headers.get("location")!).pathname).toBe("/tr/futbol-bilgi-yarismasi/kariyerden-futbolcu-tahmin-etme");
  });

  it("answers a retired Spanish quiz with a Spanish 410", async () => {
    const fetchMock = routeLookup({ kind: "gone" });
    const response = await middleware(new NextRequest("https://quizball.io/es/quiz-de-futbol/adivina-el-jugador"));
    expect(response.status).toBe(410);
    expect(String((fetchMock.mock.calls[0] as unknown[])[0])).toMatch(/\/campaign-quizzes\/routes\/guess-the-player(\?|$)/);
    expect(await response.text()).toContain('lang="es"');
  });

  it("does not look a route up for a quiz path under another language's folder", async () => {
    const fetchMock = routeLookup({ kind: "gone" });
    await middleware(new NextRequest("https://quizball.io/tr/fussball-quiz/arsenal-quiz"));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("asks with the URL's language and slug, and follows the registry's URL for a renamed page (no loop)", async () => {
    const fetchMock = routeLookup({ kind: "page", slug: "liverpool-fc", public_slug: "quiz-liverpool" });
    const response = await middleware(new NextRequest("https://quizball.io/fr/quiz-foot/quiz-liverpool"));
    expect(response.status).not.toBe(301);
    expect(String((fetchMock.mock.calls[0] as unknown[])[0])).toMatch(/\/routes\/liverpool\?locale=fr&public=quiz-liverpool$/);

    routeLookup({ kind: "page", slug: "liverpool-fc", public_slug: "quiz-liverpool" });
    const moved = await middleware(new NextRequest("https://quizball.io/fr/quiz-foot/liverpool-fc"));
    expect(moved.status).toBe(301);
    expect(new URL(moved.headers.get("location")!).pathname).toBe("/fr/quiz-foot/quiz-liverpool");
  });

  it("redirects to the target's registered URL in that language", async () => {
    routeLookup({ kind: "redirect", slug: "northwick", target_slug: "northwick-fc", public_slug: "quiz-northwick-fc" });
    const response = await middleware(new NextRequest("https://quizball.io/fr/quiz-foot/quiz-northwick"));
    expect(response.status).toBe(301);
    expect(new URL(response.headers.get("location")!).pathname).toBe("/fr/quiz-foot/quiz-northwick-fc");
  });

  it("vouches for a URL the backend confirmed, and never forwards a visitor's own claim", async () => {
    routeLookup({ kind: "page", slug: "liverpool-fc", public_slug: "quiz-liverpool" });
    const confirmed = await middleware(new NextRequest("https://quizball.io/fr/quiz-foot/quiz-liverpool"));
    expect(confirmed.headers.get("x-middleware-request-x-quiz-confirmed-source")).toBe("liverpool-fc");

    routeLookup({ kind: "missing", slug: "nowhere" });
    const forged = await middleware(new NextRequest("https://quizball.io/fr/quiz-foot/nowhere", { headers: { "x-quiz-confirmed-source": "liverpool-fc" } }));
    expect(forged.headers.get("x-middleware-request-x-quiz-confirmed-source")).toBeNull();
  });
});
