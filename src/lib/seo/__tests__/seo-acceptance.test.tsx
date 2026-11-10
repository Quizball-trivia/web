import type { ReactNode } from "react";
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PublicLanguageLink } from "@/components/i18n/PublicLanguageLink";
import { CAMPAIGN_HUB_FOLDER, campaignQuizPath } from "@/features/campaign-quiz/campaignQuiz.routes";
import { HTML_LANG, LOCALES } from "@/lib/i18n/locale";
import { dailyCollectionPath, gamePagePath, previousGamePagePaths, PUBLIC_GAMES_FOLDER } from "@/lib/seo/game-pages";
import { findPublicGameBySlug, PUBLISHED_PUBLIC_GAMES } from "@/lib/seo/public-games";
import {
  CAMPAIGN_FOLDERS, DISCOVERY_CLUSTERS, DISCOVERY_REDIRECTS, GAME_FOLDERS, HREFLANG, HUB_CLUSTER,
  SEED_CLUSTERS, absoluteAlternates, canonicalPath, crawlOptions, isPublicContentPath,
  publicContentLinks, publishedAlternatesValid, readSeoPage, readSitemapUrls,
  robotsMatch, sameAlternates,
} from "../../../../scripts/lib/seo-acceptance.mjs";

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenuItem: ({ children }: { children: ReactNode }) => children,
}));

const origin = "https://quizball.io";
const htmlFor = (paths: Record<string, string>, path = paths.en) => `
  <link href='${origin}${path}' rel='canonical'>
  ${Object.entries(absoluteAlternates(paths, origin)).map(([lang, href]) => `<link href='${href}' hreflang='${lang}' rel='alternate'>`).join("")}
  <h1>Game</h1>`;

describe("SEO acceptance fixtures", () => {
  it("covers exactly 24 discovery URLs and matches every current localized route", () => {
    const paths = Object.values(DISCOVERY_CLUSTERS).flatMap((cluster) => Object.values(cluster));
    expect(new Set(paths).size).toBe(24);
    for (const [index, locale] of LOCALES.entries()) {
      expect(HREFLANG[locale]).toBe(HTML_LANG[locale]);
      expect(GAME_FOLDERS[index]).toBe(PUBLIC_GAMES_FOLDER[locale]);
      expect(CAMPAIGN_FOLDERS[index]).toBe(CAMPAIGN_HUB_FOLDER[locale]);
      expect(HUB_CLUSTER[HTML_LANG[locale]]).toBe(`/${locale}`);
      for (const [slug, cluster] of Object.entries(DISCOVERY_CLUSTERS)) {
        const expected = slug === "career-path" ? campaignQuizPath(slug, locale) : gamePagePath(findPublicGameBySlug(slug)!, locale);
        expect(cluster[HTML_LANG[locale]], `${slug} ${locale}`).toBe(expected);
      }
      for (const [slug, cluster] of Object.entries(SEED_CLUSTERS)) {
        expect(cluster[HTML_LANG[locale]]).toBe(slug === "daily" ? dailyCollectionPath(locale) : gamePagePath(findPublicGameBySlug(slug)!, locale));
      }
    }
  });

  it("retains the three known discovery aliases in focused crawls", () => {
    const redirects = previousGamePagePaths(PUBLISHED_PUBLIC_GAMES);
    expect(DISCOVERY_REDIRECTS).toHaveLength(3);
    for (const [alias, target] of DISCOVERY_REDIRECTS) expect(redirects[alias]).toBe(target);
  });

  it.each(Object.entries(DISCOVERY_CLUSTERS))("switches all %s editions with the query preserved", (_slug, cluster) => {
    for (const source of LOCALES) for (const target of LOCALES) {
      const pathname = cluster[HTML_LANG[source]];
      const queryString = "utm_source=discovery&ref=language-test";
      const { getByRole, unmount } = render(<PublicLanguageLink pathname={pathname} queryString={queryString} code={target} active={source === target} className="" onClick={() => {}}>Language</PublicLanguageLink>);
      const link = getByRole("link");
      expect(link).toHaveAttribute("href", `${cluster[HTML_LANG[target]]}?${queryString}`);
      expect(link).toHaveAttribute("hreflang", HTML_LANG[target]);
      unmount();
    }
  });
});

describe("SEO acceptance parsing and policy", () => {
  it("accepts the eight-language cluster with pt-BR, not the stale four-language or pt key", () => {
    const paths = DISCOVERY_CLUSTERS["career-path"];
    const page = readSeoPage(htmlFor(paths), 200);
    const expected = absoluteAlternates(paths, origin);
    expect(sameAlternates(page.alternates, expected)).toBe(true);
    expect(page.h1s).toBe(1);
    expect(page.canonical).toBe(origin + paths.en);
    const { "pt-BR": portuguese, ...rest } = expected;
    expect(sameAlternates(page.alternates, { ...rest, pt: portuguese })).toBe(false);
    expect(sameAlternates(page.alternates, absoluteAlternates({ en: paths.en, ka: paths.ka, es: paths.es, tr: paths.tr }, origin))).toBe(false);
  });

  it("detects duplicate canonical and hreflang tags rather than silently overwriting them", () => {
    const html = htmlFor(DISCOVERY_CLUSTERS["football-tenable"]);
    const page = readSeoPage(html + `<link rel="canonical" href="${origin}/en"><link rel="alternate" hreflang="en" href="${origin}/en">`, 200);
    expect(page.canonical).toBeNull();
    expect(page.duplicateAlternates).toBe(true);
    expect(readSeoPage(html + "<h1>Second heading</h1>", 200).h1s).toBe(2);
  });

  it("uses production canonicals for staging and requires preview protection only on known preview hosts", () => {
    expect(crawlOptions(["https://staging.quizball.io", "--discovery-only"])).toEqual({ base: "https://staging.quizball.io", canonicalOrigin: origin, preview: true, discoveryOnly: true });
    expect(crawlOptions([origin]).preview).toBe(false);
    expect(crawlOptions(["https://quizball.io.evil.test"]).preview).toBe(false);
    expect(crawlOptions(["https://branch.vercel.app"]).preview).toBe(true);
    expect(crawlOptions([]).preview).toBe(true);
    expect(() => crawlOptions([origin, "--ignore-noindex"])).toThrow();
    expect(() => crawlOptions([origin + "/en"])).toThrow();
    const indexed = readSeoPage('<meta content="index, follow" name="robots">', 200);
    const preview = readSeoPage("", 200, "noindex, nofollow");
    expect(robotsMatch(indexed, false)).toBe(true);
    expect(robotsMatch(indexed, true)).toBe(false);
    expect(robotsMatch(preview, true)).toBe(true);
    expect(robotsMatch(preview, false)).toBe(false);
    expect(robotsMatch(readSeoPage('<meta content="noindex" name="googlebot">', 200), false)).toBe(false);
    expect(robotsMatch(readSeoPage('<meta name="robots" content="none">', 200), false)).toBe(false);
  });

  it("supports an explicit configured staging canonical origin without weakening production checks", () => {
    expect(crawlOptions(["https://staging.quizball.io", "--canonical-origin=https://staging.quizball.io/"]).canonicalOrigin).toBe("https://staging.quizball.io");
    expect(crawlOptions([origin, "--canonical-origin=" + origin]).canonicalOrigin).toBe(origin);
    for (const invalid of ["https://staging.quizball.io/en", "https://staging.quizball.io?x=1", "https://staging.quizball.io#x", "https://user:pass@staging.quizball.io", "ftp://staging.quizball.io", ""]) {
      expect(() => crawlOptions(["https://staging.quizball.io", "--canonical-origin=" + invalid])).toThrow();
    }
    for (const production of [origin, "https://www.quizball.io"]) {
      expect(() => crawlOptions([production, "--canonical-origin=https://staging.quizball.io"])).toThrow("Production must use");
    }
    expect(() => crawlOptions([origin, "--canonical-origin=" + origin, "--canonical-origin=" + origin])).toThrow();
  });

  it("requires the entire canonical URL, not just its pathname suffix", () => {
    const path = DISCOVERY_CLUSTERS["guess-the-goal-minute"].es;
    expect(canonicalPath(origin + path, origin)).toBe(path);
    for (const wrong of [`https://staging.quizball.io${path}`, `https://other.test${path}`, origin + path + "?ref=x", origin + path + "#game", origin + "/../" + path, path]) {
      expect(canonicalPath(wrong, origin)).toBeNull();
    }
  });

  it("recognizes locale-owned game and campaign folders including all new locales", () => {
    for (const path of Object.values(DISCOVERY_CLUSTERS).flatMap((cluster) => Object.values(cluster))) expect(isPublicContentPath(path)).toBe(true);
    for (const path of ["/fr/football-games/auction", "/pt/quiz-de-futbol/adivina-el-jugador", "/play", "/tr/football-quiz/career-path", "/en/football-games/auction/extra"]) expect(isPublicContentPath(path)).toBe(false);
  });

  it("validates only published members for unrelated CMS campaign pages", () => {
    const paths = { en: "/en/football-quiz/example", es: "/es/quiz-de-futbol/example" };
    const page = readSeoPage(htmlFor(paths), 200);
    const urls = new Set(Object.values(paths).map((path) => origin + path));
    expect(publishedAlternatesValid(page, paths.en, origin, urls)).toBe(true);
    expect(publishedAlternatesValid(page, paths.en, origin, new Set([origin + paths.en]))).toBe(false);
    expect(publishedAlternatesValid(page, "/en/football-quiz/other", origin, urls)).toBe(false);
    const other = readSeoPage(htmlFor({ en: paths.en }), 200);
    expect(sameAlternates(page.alternates, other.alternates)).toBe(false);
    expect(publishedAlternatesValid({ ...page, alternates: { ...page.alternates, "x-default": origin + paths.es } }, paths.en, origin, urls)).toBe(false);
  });

  it("extracts campaign and game links regardless of attribute order and decodes queries", () => {
    const campaign = DISCOVERY_CLUSTERS["career-path"].tr;
    const game = DISCOVERY_CLUSTERS["football-tenable"]["pt-BR"];
    expect(publicContentLinks(`<a class='game' href='${campaign}?ref=hub&amp;source=test'>Play</a><a href="${origin}${game}">Play</a><a href="https://other.test${game}">Other</a><a href="/play">App</a>`, origin)).toEqual([campaign + "?ref=hub&source=test", game]);
    expect(readSitemapUrls(`<url><loc>${origin}${game}</loc></url><url><loc>${origin}/en?x=1&amp;y=2</loc></url>`)).toEqual([origin + game, origin + "/en?x=1&y=2"]);
  });
});
