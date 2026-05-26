import { notFound } from "next/navigation";
import { LOCALES, isLocale } from "@/lib/i18n/locale";

// We render NO <html>/<body> here — that's the root layout's job, and it
// derives <html lang> from the URL via the x-pathname header (see middleware).
// This file exists to validate the locale param and statically generate routes.

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }
  return <>{children}</>;
}
