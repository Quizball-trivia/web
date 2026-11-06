import type { MetadataRoute } from "next";
import { CampaignQuizApiError, listCampaignQuizPages } from "@/features/campaign-quiz/campaignQuiz.api";
import { SITE_URL } from "@/lib/seo/site";
import { LOCALES } from "@/lib/i18n/locale";
import { DOWNLOAD_UPDATED_AT } from "@/lib/seo/app-download";
import { ALWAYS_ON_CAMPAIGN_HUBS } from "@/features/campaign-quiz/campaignQuiz.editions";
import { CAMPAIGN_QUIZ_LOCALES, campaignHubPath, campaignQuizPath, type CampaignQuizLocale } from "@/features/campaign-quiz/campaignQuiz.routes";
import type { CampaignQuizHubPage } from "@/features/campaign-quiz/campaignQuiz.types";

import { SEO_PAGE_LOCALES, dailyCollectionPath, gamePagePath } from "@/lib/seo/game-pages";
import { PUBLISHED_PUBLIC_GAMES, publishedLocalesOf } from "@/lib/seo/public-games";
export const dynamic = 'force-dynamic';
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entry = (
    path: string,
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"],
    priority: number,
    lastModified?: Date,
  ): MetadataRoute.Sitemap[number] => ({
    url: `${SITE_URL}${path}`,
    ...(lastModified ? { lastModified } : {}),
    changeFrequency,
    priority,
  });

  // Only localized public SEO pages. The bare /, /about, /terms, /privacy
  // routes 308-redirect to /en/... so they don't belong in the index.
  // App/product routes (/play, /leaderboard, /store, /game, /auth, etc.)
  // are client-only and intentionally excluded.
  const editorialContentUpdated = new Date("2026-08-30T00:00:00.000Z");
  const researchReportPublished = new Date("2026-08-30T00:00:00.000Z");
  const routes: Array<[
    string,
    MetadataRoute.Sitemap[number]["changeFrequency"],
    number,
    Date?,
  ]> = [
    // "" = the locale homepage (/en, /ka, /es, /pt, /de), which is the Football Games hub.
    ["", "weekly", 1.0],
    ["/about", "monthly", 0.7, editorialContentUpdated],
    ["/download", "monthly", 0.8, new Date(DOWNLOAD_UPDATED_AT)],
    ["/editorial-methodology", "monthly", 0.6, editorialContentUpdated],
    ["/terms", "yearly", 0.3],
    ["/privacy", "yearly", 0.3],
  ];

  const localizedEntries = LOCALES.flatMap((locale) =>
    routes.map(([suffix, freq, prio, lastModified]) =>
      entry(`/${locale}${suffix}`, freq, prio, lastModified)),
  );

  const researchReportEntries = (["en", "es"] as const).map((locale) =>
    entry(
      `/${locale}/football-knowledge-index`,
      "monthly",
      0.7,
      researchReportPublished,
    ),
  );

  const pressResourceEntries = (["en", "es"] as const).map((locale) =>
    entry(`/${locale}/press`, "monthly", 0.6, editorialContentUpdated),
  );
  // One indexable page per released public game (localized folder + slug) plus the daily collection.
  // No lastModified for the game pages: a single hardcoded date for every page is noise to crawlers.
  const gamePageEntries = SEO_PAGE_LOCALES.flatMap((locale) => [
    entry(dailyCollectionPath(locale), "daily", 0.8),
    ...PUBLISHED_PUBLIC_GAMES.filter((game) => publishedLocalesOf(game).includes(locale)).map((game) => entry(gamePagePath(game, locale), "weekly", 0.8)),
  ]);

  const validLastModified = (value: string): Date | undefined => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
  };

  // Fail on an unavailable catalog instead of returning a successful, incomplete sitemap.
  const campaignPages = await listCampaignQuizPages('en');
  // Only quizzes with that edition: the quiz endpoint would answer the rest in English under a translated URL. These
  // catalogs also need the page copy and every question. A backend without the language rejects it (400): no entries
  // rather than a failed sitemap.
  const catalogOrNone = (locale: CampaignQuizLocale) => listCampaignQuizPages(locale).catch((error: unknown) => {
    if (error instanceof CampaignQuizApiError && error.status === 400) return [];
    throw error;
  });
  const catalogs = new Map(await Promise.all(CAMPAIGN_QUIZ_LOCALES.map(async (locale) => {
    if (locale === 'en' || locale === 'es') return [locale, campaignPages] as const;
    return [locale, await (locale === 'ru' ? listCampaignQuizPages(locale) : catalogOrNone(locale))] as const;
  })));
  const newestUpdate = (pages: CampaignQuizHubPage[]) => pages
    .map((page) => validLastModified(page.updated_at))
    .filter((date): date is Date => Boolean(date))
    .sort((a, b) => b.getTime() - a.getTime())[0];

  const campaignEntries: MetadataRoute.Sitemap = [
    ...CAMPAIGN_QUIZ_LOCALES.flatMap((locale) => {
      // The Russian hub always exists; its pages stay to the Russian catalog.
      const pages = locale === 'ru' ? campaignPages : catalogs.get(locale)!;
      return ALWAYS_ON_CAMPAIGN_HUBS.includes(locale) || pages.length > 0
        ? [entry(campaignHubPath(locale), 'weekly', 0.9, newestUpdate(pages))]
        : [];
    }),
    ...campaignPages.flatMap((page) => CAMPAIGN_QUIZ_LOCALES
      .filter((locale) => catalogs.get(locale)!.some((edition) => edition.slug === page.slug))
      .map((locale) => entry(campaignQuizPath(page.slug, locale), 'monthly', 0.8, validLastModified(page.updated_at)))),
  ];

  return [
    // The homepage: the Play page served at the bare domain (guest state is server-rendered).
    ...gamePageEntries,
    ...localizedEntries,
    ...researchReportEntries,
    ...pressResourceEntries,
    ...campaignEntries,
  ];
}
