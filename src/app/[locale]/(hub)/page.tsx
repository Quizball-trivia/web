import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LOCALES, isLocale } from "@/lib/i18n/locale";
import { buildLocalizedMetadata } from "@/lib/i18n/metadata";
import { HOME_COPY } from "@/lib/seo/home-copy";
import { PUBLISHED_PUBLIC_GAMES, publicPagePathFor } from "@/lib/seo/public-games";
import { buildFaqStructuredData, buildGamesHomeStructuredData } from "@/lib/seo/structured-data";
import { JsonLd } from "@/features/marketing/publicGamePage";
import { HubBody, HubIntro } from "@/features/marketing/HubSeo";
import { HubMemberRedirect } from "@/features/marketing/HubMemberRedirect";
import { PlayHome } from "@/features/play/PlayHome";

type Params = Promise<{ locale: string }>;

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const copy = HOME_COPY[locale];
  return buildLocalizedMetadata({ locale, path: "", title: copy.metaTitle, description: copy.metaDescription });
}

/**
 * The locale homepage IS the Play screen. The server HTML is the guest
 * variant (H1 + intro above the hero, standings / FAQ below the cards);
 * a member who lands here is moved to /play once their session resolves.
 */
export default async function Page({ params }: { params: Params }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const copy = HOME_COPY[locale];
  const structuredData = buildGamesHomeStructuredData({
    locale,
    title: copy.metaTitle,
    description: copy.metaDescription,
    games: PUBLISHED_PUBLIC_GAMES.map((g) => ({ name: g.copy[locale].title, url: publicPagePathFor(g, locale) })),
  });
  return (
    <>
      <JsonLd data={structuredData} />
      <JsonLd data={buildFaqStructuredData(copy.faq)} />
      <HubMemberRedirect />
      <HubIntro locale={locale} />
      <PlayHome beforeFooter={<HubBody locale={locale} />} />
    </>
  );
}
