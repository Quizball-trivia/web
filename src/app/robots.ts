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
        allow: "/",
        disallow: ["/dev/", "/api/", "/auth/", "/profile/", "/settings/", "/onboarding/", "/game"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
