import { describe, expect, it } from "vitest";
import { DAILY_COLLECTION_SLUG, GAME_PAGES, PUBLIC_GAMES_FOLDER, gamePagePath, gamePageSlug } from "@/lib/seo/game-pages";
import { GAME_PAGE_DETAILS } from "@/lib/seo/game-page-details";
import { HTML_LANG, OG_LOCALE } from "@/lib/i18n/locale";
import { PUBLISHED_PUBLIC_GAMES, findPublishedGame } from "@/lib/seo/public-games";

// docs/SEO-GAME-NAMING-FR-2026-11-06.md §6: words that read as betting, or that name a show, a brand or another game.
const NEVER = /\b(quizz|money drop|tenable|miser|mise|pari|parier|cote|pronostics?|cagnotte|jackpot|encaisse[rz]?|quitte ou double|roulette|machine à sous|gagner de l’argent|chaîne de|connexions|course de chevaux|match amical|plus ou moins)\b/iu;

const frenchTexts = (slug: string): string[] => {
  const copy = GAME_PAGES.find((entry) => entry.slug === slug)?.copy.fr;
  if (!copy) throw new Error(`no French copy for ${slug}`);
  return [copy.title, copy.metaTitle, copy.metaDescription, copy.intro, copy.reward, copy.cta, ...copy.howToPlay, ...(GAME_PAGE_DETAILS[slug]?.fr ?? [])];
};

describe("French game pages", () => {
  it("uses the contract's tags and folders", () => {
    expect(HTML_LANG.fr).toBe("fr");
    expect(OG_LOCALE.fr).toBe("fr_FR");
    expect(PUBLIC_GAMES_FOLDER.fr).toBe("jeux-de-foot");
    expect(DAILY_COLLECTION_SLUG.fr).toBe("jeux-quotidiens");
  });

  it("gives all 35 games a lowercase ASCII slug of its own", () => {
    expect(GAME_PAGES).toHaveLength(35);
    const slugs = GAME_PAGES.map((entry) => gamePageSlug(entry, "fr"));
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  });

  it.each([
    ["football-tic-tac-toe", "morpion-foot"],
    ["football-codenames", "codenames-foot"],
    ["imposter", "trouve-l-intrus-foot"],
    ["stat-sniper", "au-plus-proche-foot"],
    ["squad-spin", "roue-du-foot"],
    ["football-horserace", "course-des-nations"],
    ["football-name-chain", "jeu-de-la-derniere-lettre"],
    ["played-for-both-clubs", "joueur-en-commun"],
    ["money-drop", "repartis-tes-pieces"],
    ["guess-the-goal-minute", "a-quelle-minute"],
  ])("%s lives at /fr/jeux-de-foot/%s", (key, slug) => {
    const entry = GAME_PAGES.find((candidate) => candidate.slug === key)!;
    expect(gamePagePath(entry, "fr")).toBe(`/fr/jeux-de-foot/${slug}`);
  });

  it("resolves a French address only under the French folder", () => {
    expect(findPublishedGame("fr", "jeux-de-foot", "morpion-foot")?.modeId).toBe("grid");
    expect(findPublishedGame("fr", "fussballspiele", "morpion-foot")).toBeNull();
    expect(findPublishedGame("de", "jeux-de-foot", "morpion-foot")).toBeNull();
  });

  it("opens every published page's title with the H1 and says foot, not a betting or borrowed word", () => {
    for (const game of PUBLISHED_PUBLIC_GAMES) {
      const copy = game.copy.fr;
      expect(copy.title, game.slug).toBeTruthy();
      expect(copy.metaTitle.startsWith(copy.title.split(/ [:?]/)[0]), `${game.slug}: ${copy.metaTitle}`).toBe(true);
      for (const text of frenchTexts(game.slug)) expect(text, game.slug).not.toMatch(NEVER);
    }
  });

  it("follows French typography on every page", () => {
    for (const entry of GAME_PAGES) {
      for (const text of frenchTexts(entry.slug)) {
        expect(text, `${entry.slug} straight apostrophe`).not.toMatch(/\p{L}'\p{L}/u);
        expect(text, `${entry.slug} plain space before mark`).not.toMatch(/ [;:!?»]|« /);
        expect(text, `${entry.slug} no space before mark`).not.toMatch(/[\p{L}\d][;!?](?:\s|$)|\p{L}:(?:\s|$)/u);
      }
    }
  });
});
