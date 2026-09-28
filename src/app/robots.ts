import type { MetadataRoute } from "next";
import { SITE_URL, IS_PRODUCTION_DEPLOYMENT } from "@/lib/seo/site";

export default function robots(): MetadataRoute.Robots {
  // Preview/branch deploys at *.vercel.app should not be crawled at all.
  if (!IS_PRODUCTION_DEPLOYMENT) {
    return {
      rules: [{ userAgent: "*", disallow: "/" }],
    };
  }

  return {
    rules: [
      {
        userAgent: "*",
        // Share-card images live under /api/og/; chat and social crawlers that honor robots.txt must reach them.
        allow: ["/", "/api/og/"],
        // Only truly-never-crawl paths belong here. App product pages
        // (/play, /profile, /settings, /leaderboard, /store, ...) are NOT
        // disallowed: they carry a `noindex` tag (see src/lib/seo/app-routes.ts),
        // and Google can only honor that noindex if it's allowed to crawl the
        // page. Disallowing them here would make the noindex invisible.
        disallow: ["/dev/", "/api/", "/auth/", "/onboarding/", "/game"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
