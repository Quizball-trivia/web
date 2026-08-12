import type { MetadataRoute } from "next";
import { CAMPAIGN_QUIZ_SLUGS } from "@/features/campaign-quiz/campaignQuiz.content";
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
    campaignPages = CAMPAIGN_QUIZ_SLUGS.map((slug) => ({
      slug,
      category: 'team' as const,
      h1: slug,
      breadcrumb_label: slug,
      hero_image_url: null,
      hero_image_alt: '',
      locale_mode: 'en_only' as const,
      updated_at: now.toISOString(),
    }));
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
