import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo/site";

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

  // Only true public, server-rendered, SEO-ready pages with self-referencing
  // canonicals belong here. App/product routes (/leaderboard, /play, /store)
  // are client-only and currently inherit the homepage canonical, so listing
  // them creates conflicting signals (sitemap says indexable, canonical
  // points elsewhere). Re-add them only after they become real SEO pages.
  return [
    entry("/", "daily", 1),
    entry("/about", "monthly", 0.6),
    entry("/terms", "yearly", 0.3),
    entry("/privacy", "yearly", 0.3),
  ];
}
