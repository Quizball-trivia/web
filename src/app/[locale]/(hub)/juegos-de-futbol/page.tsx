import { notFound, permanentRedirect } from "next/navigation";
import { isLocale } from "@/lib/i18n/locale";

/** The games folder has no landing page of its own: the locale homepage IS the Football Games hub. */
export default async function FolderRoot({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  permanentRedirect(`/${locale}`);
}
