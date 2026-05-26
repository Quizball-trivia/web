import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PublicOnlyGate from "@/components/auth/PublicOnlyGate";
import { WelcomeScreen } from "@/components/auth/WelcomeScreen";
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
    path: "",
    title: copy.landing.metaTitle,
    description: copy.landing.metaDescription,
  });
}

export default async function LocalizedLanding({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }
  return (
    <PublicOnlyGate>
      <WelcomeScreen />
    </PublicOnlyGate>
  );
}
