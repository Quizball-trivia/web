import { describe, expect, it } from "vitest";
import { LOCALES } from "@/lib/i18n/locale";
import { ALL_DEMO_MODES } from "@/features/demos/demoModes";
import { DAILY_COLLECTION_SLUG, PUBLIC_GAMES_FOLDER, gamePagePath, gamePageSlug } from "@/lib/seo/game-pages";
import { SEO_PAGE_LOCALES } from "@/lib/seo/game-pages";
import { GAME_PAGE_DETAILS } from "@/lib/seo/game-page-details";
import { PUBLIC_GAMES, PUBLISHED_PUBLIC_GAMES, cardHref, findPublicGameByModeId, findPublishedGame, isFullGameDemo, publishedLocalesOf, relatedPublishedGames } from "@/lib/seo/public-games";

const demoSlugs = new Set(ALL_DEMO_MODES.map((mode) => mode.slug));

describe("public games manifest", () => {
  it("has unique mode ids and slugs", () => {
    const ids = PUBLIC_GAMES.map((g) => g.modeId);
    expect(new Set(ids).size).toBe(ids.length);
    const slugs = PUBLIC_GAMES.map((g) => g.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("every demo-strategy mode names an engine that exists", () => {
    for (const game of PUBLIC_GAMES.filter((g) => g.guest === "demo")) {
      expect(game.demoSlug, game.slug).toBeTruthy();
      expect(demoSlugs.has(game.demoSlug!), `${game.slug} → ${game.demoSlug}`).toBe(true);
    }
  });

  it("published pages have unique localized paths, no collision with the collection slug, and a body in every page locale", () => {
    for (const locale of SEO_PAGE_LOCALES) {
      const paths = PUBLISHED_PUBLIC_GAMES.map((g) => gamePagePath(g, locale));
      expect(new Set(paths).size).toBe(paths.length);
      for (const game of PUBLISHED_PUBLIC_GAMES) {
        expect(gamePageSlug(game, locale)).not.toBe(DAILY_COLLECTION_SLUG[locale]);
        expect(gamePagePath(game, locale).startsWith(`/${locale}/${PUBLIC_GAMES_FOLDER[locale]}/`)).toBe(true);
        if (!publishedLocalesOf(game).includes(locale)) continue;
        expect(GAME_PAGE_DETAILS[game.slug]?.[locale]?.length ?? 0, `${game.slug} body ${locale}`).toBeGreaterThan(0);
        expect(game.copy[locale].howToPlay.length).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it("related ids resolve and never point at an unpublished page", () => {
    for (const game of PUBLISHED_PUBLIC_GAMES) {
      const related = relatedPublishedGames(game);
      expect(related.length).toBe(3);
      for (const r of related) { expect(r.page).toBe(true); expect(r.slug).not.toBe(game.slug); }
    }
  });

  it("publishes Último en pie futbolero under its Spanish and English slugs, related to Pistas and Buscaminas", () => {
    const ultimo = findPublicGameByModeId("ultimo")!;
    expect(ultimo.page).toBe(true);
    expect(ultimo.playPath).toBe("/ultimo");
    expect(ultimo.demoSlug).toBe("ultimo");
    expect(gamePagePath(ultimo, "es")).toBe("/es/juegos-de-futbol/ultimo-en-pie-futbolero");
    for (const locale of ["en", "ka", "tr"] as const) expect(gamePagePath(ultimo, locale)).toBe(`/${locale}/football-games/last-answer-standing`);
    expect(findPublishedGame("es", "juegos-de-futbol", "ultimo-en-pie-futbolero")?.modeId).toBe("ultimo");
    expect(findPublishedGame("es", "juegos-de-futbol", "last-answer-standing")).toBeNull();
    expect(findPublishedGame("tr", "football-games", "last-answer-standing")?.modeId).toBe("ultimo");
    expect(isFullGameDemo("ultimo")).toBe(true);
    expect(relatedPublishedGames(ultimo).map((g) => g.modeId)).toEqual(["pistas", "buscaminas", "grid"]);
    expect(relatedPublishedGames(findPublicGameByModeId("pistas")!).map((g) => g.modeId)).toContain("ultimo");
    expect(relatedPublishedGames(findPublicGameByModeId("buscaminas")!).map((g) => g.modeId)).toContain("ultimo");
    expect(ultimo.copy.es.title).toBe("Último en pie futbolero");
    expect(ultimo.copy.en.title).toBe("Last Answer Standing");
    expect(ultimo.copy.ka.title).toBe("ბოლომდე დარჩენილი");
    expect(ultimo.copy.tr.title).toBe("Son Kalan Futbol");
  });

  it("Último copy avoids free wording in every locale", () => {
    const ultimo = findPublicGameByModeId("ultimo")!;
    for (const locale of SEO_PAGE_LOCALES) {
      const text = [...Object.values(ultimo.copy[locale]).flat(), ...(GAME_PAGE_DETAILS[ultimo.slug]?.[locale] ?? [])].join(" ");
      expect(text, locale).not.toMatch(/\b(free|gratis|gratuit)|უფასო|ücretsiz|bedava/i);
    }
  });

  it("resolves localized URLs only inside the locale's folder", () => {
    expect(findPublishedGame("es", "juegos-de-futbol", "subasta")?.modeId).toBe("auction");
    expect(findPublishedGame("es", "football-games", "auction")).toBeNull();
    expect(findPublishedGame("en", "football-games", "auction")?.modeId).toBe("auction");
    expect(findPublishedGame("en", "football-games", "football-timeline")).toBeNull();
  });

  it("every game page is published in all four locales, and cards link to the localized page", () => {
    for (const game of PUBLISHED_PUBLIC_GAMES.filter((g) => g.page)) {
      expect(publishedLocalesOf(game), game.slug).toEqual(["en", "ka", "es", "tr"]);
    }
    expect(findPublishedGame("tr", "football-games", "auction")).not.toBeNull();
    const auction = PUBLISHED_PUBLIC_GAMES.find((g) => g.slug === "auction")!;
    expect(cardHref(auction, "tr")).toBe("/tr/football-games/auction");
    expect(cardHref(auction, "es")).toBe("/es/juegos-de-futbol/subasta");
  });

  it("a locale without a page body is not published there and its cards fall back to the English page", () => {
    const withoutBody = { ...PUBLISHED_PUBLIC_GAMES.find((g) => g.slug === "auction")!, slug: "no-such-body" };
    expect(publishedLocalesOf(withoutBody)).toEqual([]);
    expect(cardHref(withoutBody, "tr")).toBe("/en/football-games/no-such-body");
  });

  it("cards link to a page, the owning quiz page, or the app", () => {
    for (const game of PUBLIC_GAMES.filter((g) => g.card)) {
      const href = cardHref(game, "en");
      expect(href.startsWith("/")).toBe(true);
      if (game.destination.kind === "page") expect(game.page).toBe(true);
      if (game.destination.kind === "quiz") expect(href.startsWith("/en/football-quiz/")).toBe(true);
    }
    expect(cardHref(PUBLIC_GAMES.find((g) => g.modeId === "careerPath")!, "es")).toBe("/es/quiz-de-futbol/trayectoria-del-jugador");
  });
});
