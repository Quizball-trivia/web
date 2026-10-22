import type { MetadataRoute } from "next";
import { CampaignQuizApiError, listCampaignQuizPages } from "@/features/campaign-quiz/campaignQuiz.api";
import { SITE_URL } from "@/lib/seo/site";
import { LOCALES } from "@/lib/i18n/locale";
import { DOWNLOAD_UPDATED_AT } from "@/lib/seo/app-download";
import { campaignQuizPath } from "@/features/campaign-quiz/campaignQuiz.routes";

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
    // "" = the locale homepage (/en, /ka, /es, /pt), which is the Football Games hub.
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
  // Only quizzes with a Russian edition: the quiz endpoint would answer the rest in English under a Russian URL.
  const russianSlugs = new Set((await listCampaignQuizPages('ru')).map((page) => page.slug));
  // Only quizzes with a complete pt edition (page copy and every question). A backend without Portuguese pages
  // rejects the locale (400): no pt entries rather than a failed sitemap.
  const portuguesePages = await listCampaignQuizPages('pt').catch((error: unknown) => {
    if (error instanceof CampaignQuizApiError && error.status === 400) return [];
    throw error;
  });
  const portugueseSlugs = new Set(portuguesePages.map((page) => page.slug));

  const campaignEntries: MetadataRoute.Sitemap = [
    entry(
      '/en/football-quiz',
      'weekly',
      0.9,
      campaignPages
        .map((page) => validLastModified(page.updated_at))
        .filter((date): date is Date => Boolean(date))
        .sort((a, b) => b.getTime() - a.getTime())[0],
    ),
    entry(
      '/es/quiz-de-futbol',
      'weekly',
      0.9,
      campaignPages
        .map((page) => validLastModified(page.updated_at))
        .filter((date): date is Date => Boolean(date))
        .sort((a, b) => b.getTime() - a.getTime())[0],
    ),
    entry(
      '/ru/futbolnaya-viktorina',
      'weekly',
      0.9,
      campaignPages
        .map((page) => validLastModified(page.updated_at))
        .filter((date): date is Date => Boolean(date))
        .sort((a, b) => b.getTime() - a.getTime())[0],
    ),
    ...(portuguesePages.length
      ? [entry(
          '/pt/quiz-de-futebol',
          'weekly',
          0.9,
          portuguesePages
            .map((page) => validLastModified(page.updated_at))
            .filter((date): date is Date => Boolean(date))
            .sort((a, b) => b.getTime() - a.getTime())[0],
        )]
      : []),
    ...(campaignPages.some((page) => page.locale_mode === 'en_ka')
      ? [entry(
          '/ka/football-quiz',
          'weekly',
          0.9,
          campaignPages
            .filter((page) => page.locale_mode === 'en_ka')
            .map((page) => validLastModified(page.updated_at))
            .filter((date): date is Date => Boolean(date))
            .sort((a, b) => b.getTime() - a.getTime())[0],
        )]
      : []),
    ...campaignPages.flatMap((page) => {
      const english = {
        ...entry(
          `/en/football-quiz/${page.slug}`,
          'monthly',
          0.8,
          validLastModified(page.updated_at),
        ),
      };
      const spanish = {
        ...english,
        url: `${SITE_URL}${campaignQuizPath(page.slug, 'es')}`,
      };
      const russian = {
        ...english,
        url: `${SITE_URL}${campaignQuizPath(page.slug, 'ru')}`,
      };
      const portuguese = {
        ...english,
        url: `${SITE_URL}${campaignQuizPath(page.slug, 'pt')}`,
      };
      const editions = [
        spanish,
        ...(russianSlugs.has(page.slug) ? [russian] : []),
        ...(portugueseSlugs.has(page.slug) ? [portuguese] : []),
      ];
      return page.locale_mode === 'en_ka'
        ? [english, { ...english, url: `${SITE_URL}/ka/football-quiz/${page.slug}` }, ...editions]
        : [english, ...editions];
    }),
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
