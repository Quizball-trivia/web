import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { LOCALES, isLocale, type Locale } from "@/lib/i18n/locale";
import { buildLocalizedMetadata } from "@/lib/i18n/metadata";
import { DAILY_COLLECTION_SLUG, PUBLIC_GAMES_FOLDER, dailyCollectionPath, gamePagePath } from "@/lib/seo/game-pages";
import { COLLECTION_COPY, HOME_COPY } from "@/lib/seo/home-copy";
import { PUBLISHED_PUBLIC_GAMES, findPublishedGame, homepageCards } from "@/lib/seo/public-games";
import { buildGamesHomeStructuredData, buildPublicGameStructuredData, serializeJsonLd } from "@/lib/seo/structured-data";
import { PublicGameScreen } from "./PublicGameScreen";
import { DailyCollectionScreen } from "./DailyCollectionScreen";

type Params = Promise<{ locale: string; slug: string }>;

/** Locales served by a folder (en + ka share football-games, es has juegos-de-futbol). */
const localesForFolder = (folder: string): Locale[] => LOCALES.filter((locale) => PUBLIC_GAMES_FOLDER[locale] === folder);
const afterLocale = (path: string, locale: Locale) => path.slice(`/${locale}`.length);

export async function JsonLd({ data }: { data: unknown }) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return <script nonce={nonce} type="application/ld+json" suppressHydrationWarning dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />;
}

// ---- game pages ------------------------------------------------------------
export const dailyCollectionStaticParams = (folder: string) => localesForFolder(folder).map((locale) => ({ locale }));

export function publicGameStaticParams(folder: string) {
  return localesForFolder(folder).flatMap((locale) =>
    PUBLISHED_PUBLIC_GAMES.map((game) => ({ locale, slug: gamePagePath(game, locale).split("/")[3] })),
  );
}

export async function publicGameMetadata(folder: string, params: Params): Promise<Metadata> {
  const { locale, slug } = await params;
  // Decided here, before any streaming starts, so the response status is a real 404.
  if (!isLocale(locale)) notFound();
  const game = findPublishedGame(locale, folder, slug);
  if (!game) notFound();
  const copy = game.copy[locale];
  return buildLocalizedMetadata({
    locale,
    path: afterLocale(gamePagePath(game, locale), locale),
    paths: Object.fromEntries(LOCALES.map((l) => [l, afterLocale(gamePagePath(game, l), l)])),
    title: copy.metaTitle,
    description: copy.metaDescription,
  });
}

export async function PublicGamePage({ folder, params }: { folder: string; params: Params }) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const game = findPublishedGame(locale, folder, slug);
  if (!game) notFound();
  const copy = game.copy[locale];
  const structuredData = buildPublicGameStructuredData({
    locale,
    path: gamePagePath(game, locale),
    name: copy.title,
    description: copy.metaDescription,
    homeLabel: HOME_COPY[locale].nav.games,
    free: true,
  });
  return (
    <>
      <JsonLd data={structuredData} />
      <PublicGameScreen game={game} locale={locale} />
    </>
  );
}

// ---- daily collection ------------------------------------------------------
export async function dailyCollectionMetadata(folder: string, params: Promise<{ locale: string }>): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale) || PUBLIC_GAMES_FOLDER[locale] !== folder) notFound();
  const copy = COLLECTION_COPY[locale];
  return buildLocalizedMetadata({
    locale,
    path: afterLocale(dailyCollectionPath(locale), locale),
    paths: Object.fromEntries(LOCALES.map((l) => [l, afterLocale(dailyCollectionPath(l), l)])),
    title: copy.metaTitle,
    description: copy.metaDescription,
  });
}

export async function DailyCollectionPage({ folder, params }: { folder: string; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale) || PUBLIC_GAMES_FOLDER[locale] !== folder) notFound();
  const copy = COLLECTION_COPY[locale];
  const structuredData = buildGamesHomeStructuredData({
    locale,
    path: dailyCollectionPath(locale),
    title: copy.metaTitle,
    description: copy.metaDescription,
    games: homepageCards("daily").filter((g) => g.page).map((g) => ({ name: g.copy[locale].title, url: gamePagePath(g, locale) })),
  });
  return (
    <>
      <JsonLd data={structuredData} />
      <DailyCollectionScreen locale={locale} />
    </>
  );
}

export const DAILY_COLLECTION_SLUGS = DAILY_COLLECTION_SLUG;
