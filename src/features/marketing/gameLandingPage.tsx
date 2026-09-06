import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { GameLandingScreen } from "@/features/marketing/GameLandingScreen";
import { LOCALES, isLocale } from "@/lib/i18n/locale";
import { buildLocalizedMetadata } from "@/lib/i18n/metadata";
import { GAME_PAGES, findGamePage, type GamePageSection } from "@/lib/seo/game-pages";
import { buildEditorialPageStructuredData, serializeJsonLd } from "@/lib/seo/structured-data";

/** Shared implementation behind /{locale}/daily/[slug] and /{locale}/games/[slug]. */
export function gameLandingStaticParams(section: GamePageSection) {
  return LOCALES.flatMap((locale) =>
    GAME_PAGES.filter((entry) => entry.section === section).map((entry) => ({ locale, slug: entry.slug })),
  );
}

export async function gameLandingMetadata(
  section: GamePageSection,
  params: Promise<{ locale: string; slug: string }>,
): Promise<Metadata> {
  const { locale, slug } = await params;
  const entry = findGamePage(section, slug);
  if (!isLocale(locale) || !entry) return {};
  const copy = entry.copy[locale];
  return buildLocalizedMetadata({
    locale,
    path: `/${section}/${slug}`,
    title: copy.metaTitle,
    description: copy.metaDescription,
  });
}

export async function GameLandingPage({
  section,
  params,
}: {
  section: GamePageSection;
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const entry = findGamePage(section, slug);
  if (!isLocale(locale) || !entry) notFound();
  const copy = entry.copy[locale];
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const structuredData = buildEditorialPageStructuredData({
    locale,
    path: `/${section}/${slug}`,
    title: copy.metaTitle,
    description: copy.metaDescription,
    pageType: "WebPage",
  });
  return (
    <>
      <script
        nonce={nonce}
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }}
      />
      <GameLandingScreen entry={entry} locale={locale} />
    </>
  );
}
