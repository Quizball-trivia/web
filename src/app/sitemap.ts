import type { MetadataRoute } from "next";
import { listCampaignQuizPages } from "@/features/campaign-quiz/campaignQuiz.api";
import { SITE_URL } from "@/lib/seo/site";
import { LOCALES } from "@/lib/i18n/locale";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const entry = (
    path: string,
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"],
    priority: number,
  ): MetadataRoute.Sitemap[number] => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  });

  // Only localized public SEO pages. The bare /, /about, /terms, /privacy
  // routes 308-redirect to /en/... so they don't belong in the index.
  // App/product routes (/play, /leaderboard, /store, /game, /auth, etc.)
  // are client-only and intentionally excluded.
  const routes: Array<[string, MetadataRoute.Sitemap[number]["changeFrequency"], number]> = [
    ["", "daily", 1],
    ["/about", "monthly", 0.6],
    ["/terms", "yearly", 0.3],
    ["/privacy", "yearly", 0.3],
  ];

  const localizedEntries = LOCALES.flatMap((locale) =>
    routes.map(([suffix, freq, prio]) => entry(`/${locale}${suffix}`, freq, prio)),
  );

  let campaignPages: Awaited<ReturnType<typeof listCampaignQuizPages>>;
  try {
    campaignPages = await listCampaignQuizPages('en');
  } catch {
    // Do not revive unpublished/deleted pages from a hardcoded fallback.
    campaignPages = [];
  }

  const campaignEntries: MetadataRoute.Sitemap = [
    entry('/en/football-quiz', 'weekly', 0.9),
    ...(campaignPages.some((page) => page.locale_mode === 'en_ka')
      ? [entry('/ka/football-quiz', 'weekly', 0.9)]
      : []),
    ...campaignPages.flatMap((page) => {
      const english = {
        ...entry(`/en/football-quiz/${page.slug}`, 'monthly', 0.8),
        lastModified: new Date(page.updated_at),
      };
      return page.locale_mode === 'en_ka'
        ? [english, { ...english, url: `${SITE_URL}/ka/football-quiz/${page.slug}` }]
        : [english];
    }),
  ];

  return [...localizedEntries, ...campaignEntries];
}
