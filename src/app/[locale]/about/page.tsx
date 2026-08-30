import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { AboutScreen } from "@/features/marketing/AboutScreen";
import { isLocale } from "@/lib/i18n/locale";
import { getCopy } from "@/lib/i18n/copy";
import { buildLocalizedMetadata } from "@/lib/i18n/metadata";
import {
  buildEditorialPageStructuredData,
  serializeJsonLd,
} from "@/lib/seo/structured-data";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const copy = getCopy(locale);
  return buildLocalizedMetadata({
    locale,
    path: "/about",
    title: copy.about.metaTitle,
    description: copy.about.metaDescription,
  });
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }
  const copy = getCopy(locale);
  const headerList = await headers();
  const nonce = headerList.get("x-nonce") ?? undefined;
  const structuredData = buildEditorialPageStructuredData({
    locale,
    path: "/about",
    title: copy.about.metaTitle,
    description: copy.about.metaDescription,
    pageType: "AboutPage",
  });

  return (
    <>
      <script
        nonce={nonce}
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }}
      />
      <AboutScreen copy={copy.about} locale={locale} />
    </>
  );
}
