import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AboutScreen } from "@/features/marketing/AboutScreen";
import { isLocale } from "@/lib/i18n/locale";
import { getCopy } from "@/lib/i18n/copy";
import { buildLocalizedMetadata } from "@/lib/i18n/metadata";

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
  return <AboutScreen copy={copy.about} locale={locale} />;
}
