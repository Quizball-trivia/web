import { describe, expect, it } from "vitest";
import { LOCALES } from "@/lib/i18n/locale";
import { ALL_DEMO_MODES } from "@/features/demos/demoModes";
import { DAILY_COLLECTION_SLUG, GAME_PAGES, PUBLIC_GAMES_FOLDER, gamePagePath, gamePageSlug } from "@/lib/seo/game-pages";
import { SEO_PAGE_LOCALES } from "@/lib/seo/game-pages";
import { GAME_PAGE_DETAILS } from "@/lib/seo/game-page-details";
import { PUBLIC_GAMES, PUBLISHED_PUBLIC_GAMES, cardHref, findPublicGameByModeId, guestCardHref, findPublishedGame, isFullGameDemo, publishedLocalesOf, relatedPublishedGames } from "@/lib/seo/public-games";

const demoSlugs = new Set(ALL_DEMO_MODES.map((mode) => mode.slug));

describe("public games manifest", () => {
  it.each([["fr", "/fr/jeux-de-foot/devine-le-but"], ["de", "/de/fussballspiele/tor-erraten"], ["es", "/es/juegos-de-futbol/adivina-el-gol"], ["en", "/en/football-games/guess-the-goal"], ["tr", "/tr/futbol-oyunlari/guess-the-goal"], ["ru", "/ru/futbolnye-igry/ugaday-gol"], ["pt", "/pt/jogos-de-futebol/adivinhe-o-gol"], ["ka", "/ka/football-games/guess-the-goal"]] as const)("the Guess the Goal Play card takes a %s guest to the page, not to sign-in", (locale, path) => {
    expect(guestCardHref({ slug: "mini-guess-the-goal" }, locale)).toBe(path);
  });

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

  it("room-strategy modes run no inline engine and carry the room labels in every locale", () => {
    const rooms = PUBLIC_GAMES.filter((g) => g.guest === "room");
    expect(rooms.map((g) => g.modeId)).toEqual(["mentalista"]);
    for (const game of rooms) {
      expect(game.demoSlug, game.slug).toBeUndefined();
      for (const locale of LOCALES) {
        expect(game.copy[locale].roomBadge, `${game.slug} badge ${locale}`).toBeTruthy();
        expect(game.copy[locale].roomAccountNotice, `${game.slug} account notice ${locale}`).toBeTruthy();
      }
    }
    // Other modes keep their copy shape unchanged.
    for (const game of PUBLIC_GAMES.filter((g) => g.guest !== "room")) {
      for (const locale of LOCALES) expect(game.copy[locale].roomBadge ?? game.copy[locale].roomAccountNotice, `${game.slug} ${locale}`).toBeUndefined();
    }
  });

  it("publishes Football Mentalista as a friends' room under its own localized URL in every locale", () => {
    const game = findPublicGameByModeId("mentalista")!;
    expect(game).toMatchObject({ slug: "football-mentalista", group: "multiplayer", guest: "room", page: true, card: true, destination: { kind: "page" }, playPath: "/friend/room/new?room=mentalista", artSlug: "mentalista", section: "games" });
    expect(game.demoSlug).toBeUndefined();
    expect(isFullGameDemo(game.demoSlug)).toBe(false);
    const expected = {
      en: "/en/football-games/football-mentalista",
      ka: "/ka/football-games/football-mentalista",
      es: "/es/juegos-de-futbol/mentalista-futbolero",
      tr: "/tr/futbol-oyunlari/futbol-mentalisti",
      ru: "/ru/futbolnye-igry/futbolnyy-mentalist",
      pt: "/pt/jogos-de-futebol/mentalista-do-futebol",
      de: "/de/fussballspiele/fussball-mentalist",
      fr: "/fr/jeux-de-foot/mentaliste-foot",
    } as const;
    for (const locale of SEO_PAGE_LOCALES) {
      const [, , folder, slug] = expected[locale].split("/");
      expect(gamePagePath(game, locale)).toBe(expected[locale]);
      expect(cardHref(game, locale)).toBe(expected[locale]);
      expect(findPublishedGame(locale, folder, slug)?.modeId).toBe("mentalista");
      // No other copy entry (published or not) owns the same slug in this locale.
      expect(GAME_PAGES.filter((entry) => gamePageSlug(entry, locale) === slug).map((entry) => entry.slug), locale).toEqual(["football-mentalista"]);
      expect(slug).not.toBe(DAILY_COLLECTION_SLUG[locale]);
    }
    expect(findPublishedGame("es", "juegos-de-futbol", "football-mentalista")).toBeNull();
    expect(findPublishedGame("fr", "football-games", "mentaliste-foot")).toBeNull();
    expect(publishedLocalesOf(game)).toEqual([...SEO_PAGE_LOCALES]);
    expect(relatedPublishedGames(game).map((g) => g.modeId)).toEqual(["codenames", "grid", "auction"]);
    for (const modeId of game.related) expect(findPublicGameByModeId(modeId)?.page, modeId).toBe(true);
  });

  it("Football Mentalista bodies state the room rules, the language split and the conditional account in every locale", () => {
    const game = findPublicGameByModeId("mentalista")!;
    const english = GAME_PAGE_DETAILS[game.slug]!.en!.join(" ");
    for (const rule of ["3 to 6 players", "three provided options", "secretly lock", "exact prediction", "2 points", "the chooser earns 0 that round", "every player chooses exactly once", "no daily edition, no solo mode and no practice demo", "no stakes, coins, XP or ranking", "invitation link"]) {
      expect(english).toContain(rule);
    }
    // [word for "eight" (interface languages), the four category languages, the guest-room term].
    const languageSplit: Record<(typeof SEO_PAGE_LOCALES)[number], [string, string[], RegExp]> = {
      en: ["eight", ["English", "Spanish", "Georgian", "Turkish"], /guest rooms/],
      ka: ["რვა", ["ინგლისურ", "ესპანურ", "ქართულ", "თურქულ"], /სტუმრის ოთახ/],
      es: ["ocho", ["inglés", "español", "georgiano", "turco"], /salas para invitados/],
      tr: ["sekiz", ["İngilizce", "İspanyolca", "Gürcüce", "Türkçe"], /isafir odalar/],
      ru: ["восьми", ["английском", "испанском", "грузинском", "турецком"], /гостевые комнаты/],
      pt: ["oito", ["inglês", "espanhol", "georgiano", "turco"], /salas para convidados/],
      de: ["acht", ["Englisch", "Spanisch", "Georgisch", "Türkisch"], /Gasträume/],
      fr: ["huit", ["anglais", "espagnol", "géorgien", "turc"], /salons invités/],
    };
    for (const locale of SEO_PAGE_LOCALES) {
      const body = GAME_PAGE_DETAILS[game.slug]?.[locale] ?? [];
      expect(body.length, locale).toBeGreaterThanOrEqual(4);
      const [eight, categoryLanguages, guestRooms] = languageSplit[locale];
      const languages = body[body.length - 1];
      expect(languages, locale).toContain(eight);
      for (const name of categoryLanguages) expect(languages, `${locale} ${name}`).toContain(name);
      expect(languages, locale).toMatch(guestRooms);
      expect(game.copy[locale].roomAccountNotice, locale).toMatch(guestRooms);
      const all = [body.join(" "), ...Object.values(game.copy[locale]).flat()].join(" ");
      for (const digit of ["2", "0", "3", "6"]) expect(all, `${locale} ${digit}`).toContain(digit);
      expect(all, locale).not.toMatch(/\b(free|gratis|gratuit)|უფასო|ücretsiz|bedava|kostenlos|grátis|бесплатн/i);
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
    for (const locale of ["en", "ka"] as const) expect(gamePagePath(ultimo, locale)).toBe(`/${locale}/football-games/last-answer-standing`);
    expect(gamePagePath(ultimo, "tr")).toBe("/tr/futbol-oyunlari/futbolcu-sayma-oyunu");
    expect(findPublishedGame("es", "juegos-de-futbol", "ultimo-en-pie-futbolero")?.modeId).toBe("ultimo");
    expect(findPublishedGame("es", "juegos-de-futbol", "last-answer-standing")).toBeNull();
    expect(findPublishedGame("tr", "futbol-oyunlari", "futbolcu-sayma-oyunu")?.modeId).toBe("ultimo");
    expect(findPublishedGame("tr", "football-games", "last-answer-standing")).toBeNull();
    expect(isFullGameDemo("ultimo")).toBe(true);
    expect(relatedPublishedGames(ultimo).map((g) => g.modeId)).toEqual(["pistas", "buscaminas", "grid"]);
    expect(relatedPublishedGames(findPublicGameByModeId("pistas")!).map((g) => g.modeId)).toContain("ultimo");
    expect(relatedPublishedGames(findPublicGameByModeId("buscaminas")!).map((g) => g.modeId)).toContain("ultimo");
    expect(ultimo.copy.es.title).toBe("Último en pie futbolero");
    expect(ultimo.copy.en.title).toBe("Last Answer Standing");
    expect(ultimo.copy.ka.title).toBe("ბოლომდე დარჩენილი");
    expect(ultimo.copy.tr.title).toBe("Futbolcu Sayma Oyunu");
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

  it("every game page is published in all seven locales, and cards link to the localized page", () => {
    for (const game of PUBLISHED_PUBLIC_GAMES.filter((g) => g.page)) {
      expect(publishedLocalesOf(game), game.slug).toEqual(["en", "ka", "es", "tr", "ru", "pt", "de", "fr"]);
    }
    expect(findPublishedGame("tr", "futbol-oyunlari", "auction")).not.toBeNull();
    const auction = PUBLISHED_PUBLIC_GAMES.find((g) => g.slug === "auction")!;
    expect(cardHref(auction, "tr")).toBe("/tr/futbol-oyunlari/auction");
    expect(cardHref(auction, "es")).toBe("/es/juegos-de-futbol/subasta");
    expect(cardHref(auction, "ru")).toBe("/ru/futbolnye-igry/futbolnyy-auktsion");
    expect(cardHref(auction, "pt")).toBe("/pt/jogos-de-futebol/leilao-de-jogadores");
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
    expect(cardHref(PUBLIC_GAMES.find((g) => g.modeId === "careerPath")!, "ru")).toBe("/ru/futbolnaya-viktorina/ugaday-futbolista-po-karere");
    expect(cardHref(PUBLIC_GAMES.find((g) => g.modeId === "clues")!, "ru")).toBe("/ru/futbolnaya-viktorina/ugaday-futbolista");
    expect(cardHref(PUBLIC_GAMES.find((g) => g.modeId === "careerPath")!, "pt")).toBe("/pt/quiz-de-futebol/adivinhe-o-jogador-pela-carreira");
    expect(cardHref(PUBLIC_GAMES.find((g) => g.modeId === "clues")!, "pt")).toBe("/pt/quiz-de-futebol/adivinhe-o-jogador");
    // career-path has no game page of its own: the de card goes to the campaign quiz that reuses its slug.
    expect(cardHref(PUBLIC_GAMES.find((g) => g.modeId === "careerPath")!, "de")).toBe("/de/fussball-quiz/karrierestationen-erraten");
    expect(cardHref(PUBLIC_GAMES.find((g) => g.modeId === "clues")!, "de")).toBe("/de/fussball-quiz/fussballer-erraten");
    expect(cardHref(PUBLIC_GAMES.find((g) => g.modeId === "careerPath")!, "fr")).toBe("/fr/quiz-foot/devine-le-joueur-avec-les-clubs");
    expect(cardHref(PUBLIC_GAMES.find((g) => g.modeId === "clues")!, "fr")).toBe("/fr/quiz-foot/devine-le-joueur");
    expect(cardHref(PUBLIC_GAMES.find((g) => g.modeId === "careerPath")!, "tr")).toBe("/tr/futbol-bilgi-yarismasi/kariyerden-futbolcu-tahmin-etme");
    expect(cardHref(PUBLIC_GAMES.find((g) => g.modeId === "clues")!, "tr")).toBe("/tr/futbol-bilgi-yarismasi/futbolcu-bilmece");
    expect(cardHref(PUBLIC_GAMES.find((g) => g.modeId === "careerPath")!, "ka")).toBe("/ka/football-quiz/career-path");
  });
});
