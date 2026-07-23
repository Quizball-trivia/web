import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo/site";
import { LOCALES } from "@/lib/i18n/locale";

export default function sitemap(): MetadataRoute.Sitemap {
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

  // UK campaign pages launch in English only. Do not emit a Georgian alternate
  // or sitemap URL until an equivalent Georgian quiz genuinely exists.
  const englishCampaignEntries = [
    entry('/en/football-quiz', 'weekly', 0.9),
    entry('/en/football-quiz/liverpool', 'monthly', 0.8),
    entry('/en/football-quiz/manchester-united', 'monthly', 0.8),
    entry('/en/football-quiz/tottenham', 'monthly', 0.8),
    entry('/en/football-quiz/everton', 'monthly', 0.8),
    entry('/en/football-quiz/premier-league', 'monthly', 0.8),
    entry('/en/football-quiz/guess-the-player', 'monthly', 0.8),
    entry('/en/football-quiz/career-path', 'monthly', 0.8),
    entry('/en/football-quiz/club-badges', 'monthly', 0.8),
  ];

  return [...localizedEntries, ...englishCampaignEntries];
}
