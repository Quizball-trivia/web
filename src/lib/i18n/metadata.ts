import type { Metadata } from "next";
import {
  SITE_NAME,
  SITE_OG_IMAGE_ALT,
  SITE_OG_IMAGE_PATH,
  SITE_URL,
} from "@/lib/seo/site";
import { DEFAULT_LOCALE, LOCALES, OG_LOCALE, type Locale } from "./locale";

interface LocalizedMetadataInput {
  locale: Locale;
  // Path AFTER the locale segment, e.g. "" for /en, "/about" for /en/about.
  // Leading slash optional (we normalize).
  path: string;
  title: string;
  description: string;
}

// Builds canonical, hreflang, og locale/url for any localized public page.
// Generates absolute URLs (required for hreflang per Google's spec).
export function buildLocalizedMetadata({
  locale,
  path,
  title,
  description,
}: LocalizedMetadataInput): Metadata {
  const suffix = path.startsWith("/") || path === "" ? path : `/${path}`;
  const canonical = `${SITE_URL}/${locale}${suffix}`;

  const languages: Record<string, string> = {};
  for (const l of LOCALES) {
    languages[l] = `${SITE_URL}/${l}${suffix}`;
  }
  languages["x-default"] = `${SITE_URL}/${DEFAULT_LOCALE}${suffix}`;

  return {
    title,
    description,
    alternates: {
      canonical,
      languages,
    },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title,
      description,
      url: canonical,
      locale: OG_LOCALE[locale],
      alternateLocale: LOCALES.filter((l) => l !== locale).map((l) => OG_LOCALE[l]),
      images: [{
        url: SITE_OG_IMAGE_PATH,
        width: 1200,
        height: 630,
        alt: SITE_OG_IMAGE_ALT,
      }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [SITE_OG_IMAGE_PATH],
    },
  };
}
