import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";
import { GAME_PAGES, dailyCollectionPath, gamePagePath, previousGamePagePaths } from "@/lib/seo/game-pages";
import { PUBLISHED_PUBLIC_GAMES, findPublishedGame } from "@/lib/seo/public-games";

const redirects = previousGamePagePaths(PUBLISHED_PUBLIC_GAMES);
const livePaths = new Set(GAME_PAGES.flatMap((entry) => (["en", "ka", "es", "tr"] as const).map((locale) => gamePagePath(entry, locale))));

describe("renamed public game URLs", () => {
  it("moves the old Spanish slugs to the searched names", () => {
    expect(redirects["/es/juegos-de-futbol/clasificatoria"]).toBe("/es/juegos-de-futbol/quien-sabe-mas-de-futbol");
    expect(redirects["/es/juegos-de-futbol/francotirador-de-datos"]).toBe("/es/juegos-de-futbol/aproximado-futbolero");
    expect(redirects["/es/juegos-de-futbol/once-perdido"]).toBe("/es/juegos-de-futbol/adivina-el-11");
    expect(redirects["/es/juegos-de-futbol/cadena-de-pases"]).toBe("/es/juegos-de-futbol/conectando-jugadores");
    expect(redirects["/es/juegos-de-futbol/ruleta-de-plantilla"]).toBe("/es/juegos-de-futbol/ruleta-futbolera");
    expect(redirects["/es/juegos-de-futbol/mas-o-menos"]).toBe("/es/juegos-de-futbol/higher-or-lower-futbolero");
    // The in-game title of "¿En qué minuto?" is a second address for its one page.
    expect(redirects["/es/juegos-de-futbol/en-que-minuto-futbolero"]).toBe("/es/juegos-de-futbol/adivina-el-minuto-exacto-del-gol");
    expect(Object.keys(redirects).filter((from) => from.startsWith("/es/"))).toHaveLength(7);
  });

  it("moves every Turkish page out of the English folder", () => {
    for (const entry of PUBLISHED_PUBLIC_GAMES) expect(redirects[`/tr/football-games/${entry.slug}`], entry.slug).toBe(gamePagePath(entry, "tr"));
    expect(redirects["/tr/football-games"]).toBe("/tr");
    expect(redirects["/tr/football-games/daily-challenges"]).toBe(dailyCollectionPath("tr"));
    expect(gamePagePath(GAME_PAGES.find((entry) => entry.slug === "football-clues")!, "tr")).toBe("/tr/futbol-oyunlari/futbolcu-tahmin-etme-oyunu");
  });

  it("never redirects a live page, never chains, and touches English and Georgian only where a page was renamed", () => {
    for (const [from, to] of Object.entries(redirects)) {
      expect(livePaths.has(from), from).toBe(false);
      expect(redirects[to], `${from} → ${to} chains`).toBeUndefined();
      expect(from.startsWith("/ka/"), from).toBe(false);
    }
    expect(Object.keys(redirects).filter((from) => from.startsWith("/en/"))).toEqual(["/en/football-games/stat-sniper"]);
  });

  it("moves Stat Sniper to the searched names in English and Turkish (and keeps the Spanish and Georgian ones)", () => {
    expect(redirects["/en/football-games/stat-sniper"]).toBe("/en/football-games/closest-wins");
    expect(redirects["/football-games/stat-sniper"]).toBe("/en/football-games/closest-wins");
    // Renamed after the Turkish folder move: both the old folder and the current folder redirect.
    expect(redirects["/tr/futbol-oyunlari/stat-sniper"]).toBe("/tr/futbol-oyunlari/en-yakin-tahmin-oyunu");
    expect(redirects["/tr/football-games/stat-sniper"]).toBe("/tr/futbol-oyunlari/en-yakin-tahmin-oyunu");
    const entry = GAME_PAGES.find((page) => page.slug === "stat-sniper")!;
    expect(gamePagePath(entry, "es")).toBe("/es/juegos-de-futbol/aproximado-futbolero");
    expect(gamePagePath(entry, "ka")).toBe("/ka/football-games/stat-sniper");
  });

  it("lands every old game URL on a published page", () => {
    for (const to of Object.values(redirects)) {
      const [, locale, folder, slug] = to.split("/");
      if (!slug || to === dailyCollectionPath(locale as "tr")) continue;
      expect(findPublishedGame(locale as "es" | "tr", folder, slug), to).not.toBeNull();
    }
  });

  it("answers the old URLs with a permanent redirect that keeps the query", async () => {
    const response = await middleware(new NextRequest("https://quizball.io/tr/football-games/football-clues?utm_source=google"));
    expect(response.status).toBe(308);
    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/tr/futbol-oyunlari/futbolcu-tahmin-etme-oyunu");
    expect(location.searchParams.get("utm_source")).toBe("google");
  });

  it("redirects a percent-encoded old URL too", async () => {
    const response = await middleware(new NextRequest("https://quizball.io/tr/football-games/%61uction"));
    expect(response.status).toBe(308);
    expect(new URL(response.headers.get("location")!).pathname).toBe("/tr/futbol-oyunlari/auction");
  });

  it("404s a games folder under the wrong locale", async () => {
    expect((await middleware(new NextRequest("https://quizball.io/tr/football-games/no-such-page"))).status).toBe(404);
    expect((await middleware(new NextRequest("https://quizball.io/es/futbol-oyunlari/futbol-xox"))).status).toBe(404);
    expect((await middleware(new NextRequest("https://quizball.io/en/futbol-oyunlari"))).status).toBe(404);
  });
});
