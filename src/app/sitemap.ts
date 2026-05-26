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

  return [
    entry("/", "daily", 1),
    entry("/leaderboard", "hourly", 0.8),
    entry("/play", "weekly", 0.7),
    entry("/store", "weekly", 0.5),
    entry("/terms", "yearly", 0.3),
    entry("/privacy", "yearly", 0.3),
  ];
}
