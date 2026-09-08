import type { Metadata } from "next";
import { IS_PRODUCTION_DEPLOYMENT, SITE_DESCRIPTION, SITE_TAGLINE } from "@/lib/seo/site";

/**
 * /play is the homepage ("/" is rewritten to it in the middleware). Unlike the other app routes it
 * renders a guest state on the server, so it is indexable — overriding the
 * app-wide noindex. Non-production deployments stay hidden as everywhere else.
 */
export const metadata: Metadata = {
  title: SITE_TAGLINE,
  description: SITE_DESCRIPTION,
  // Served at both "/" (rewrite) and "/play"; the bare domain is canonical.
  alternates: { canonical: "/" },
  robots: IS_PRODUCTION_DEPLOYMENT
    ? { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" } }
    : { index: false, follow: false },
};

export default function PlayLayout({ children }: { children: React.ReactNode }) {
  return children;
}
