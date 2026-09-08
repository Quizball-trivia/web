import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { HubScreen } from "@/features/marketing/HubScreen";
import { isLocale } from "@/lib/i18n/locale";
import { buildLocalizedMetadata } from "@/lib/i18n/metadata";
import { HUB_COPY, type HubKind } from "@/lib/seo/hub-pages";
import { buildEditorialPageStructuredData, serializeJsonLd } from "@/lib/seo/structured-data";

const HUB_PATH: Record<HubKind, string> = { home: "", daily: "/daily", games: "/games" };

export async function hubMetadata(kind: HubKind, params: Promise<{ locale: string }>): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const copy = HUB_COPY[kind][locale];
  return buildLocalizedMetadata({ locale, path: HUB_PATH[kind], title: copy.metaTitle, description: copy.metaDescription });
}

export async function HubPage({ kind, params }: { kind: HubKind; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const copy = HUB_COPY[kind][locale];
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const structuredData = buildEditorialPageStructuredData({
    locale,
    path: HUB_PATH[kind],
    title: copy.metaTitle,
    description: copy.metaDescription,
    pageType: "WebPage",
  });
  return (
    <>
      <script nonce={nonce} type="application/ld+json" suppressHydrationWarning dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }} />
      <HubScreen kind={kind} locale={locale} />
    </>
  );
}
