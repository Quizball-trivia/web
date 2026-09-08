import { describe, expect, it } from "vitest";
import { LOCALES } from "@/lib/i18n/locale";
import { ALL_DEMO_MODES } from "@/features/demos/demoModes";
import { DAILY_COLLECTION_SLUG, PUBLIC_GAMES_FOLDER, gamePagePath, gamePageSlug } from "@/lib/seo/game-pages";
import { GAME_PAGE_DETAILS } from "@/lib/seo/game-page-details";
import { PUBLIC_GAMES, PUBLISHED_PUBLIC_GAMES, cardHref, findPublishedGame, relatedPublishedGames } from "@/lib/seo/public-games";

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

  it("published pages have unique localized paths, no collision with the collection slug, and a body in every locale", () => {
    for (const locale of LOCALES) {
      const paths = PUBLISHED_PUBLIC_GAMES.map((g) => gamePagePath(g, locale));
      expect(new Set(paths).size).toBe(paths.length);
      for (const game of PUBLISHED_PUBLIC_GAMES) {
        expect(gamePageSlug(game, locale)).not.toBe(DAILY_COLLECTION_SLUG[locale]);
        expect(gamePagePath(game, locale).startsWith(`/${locale}/${PUBLIC_GAMES_FOLDER[locale]}/`)).toBe(true);
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

  it("resolves localized URLs only inside the locale's folder", () => {
    expect(findPublishedGame("es", "juegos-de-futbol", "subasta")?.modeId).toBe("auction");
    expect(findPublishedGame("es", "football-games", "auction")).toBeNull();
    expect(findPublishedGame("en", "football-games", "auction")?.modeId).toBe("auction");
    expect(findPublishedGame("en", "football-games", "football-timeline")).toBeNull();
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
