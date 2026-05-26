import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LegalScreen } from "@/features/marketing/LegalScreen";
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
    path: "/terms",
    title: copy.terms.metaTitle,
    description: copy.terms.metaDescription,
  });
}

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }
  const copy = getCopy(locale);
  return <LegalScreen copy={copy.terms} locale={locale} variant="terms" />;
}
