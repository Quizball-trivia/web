import { notFound, redirect } from "next/navigation";
import { isLocale } from "@/lib/i18n/locale";

// The marketing landing is retired — the Play page (with a signed-out guest
// state) is the front door. Locale indexes only exist to catch old links and
// cached 308s from the previous "/" → "/en|/ka" redirect.
export default async function LocalizedLanding({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }
  redirect("/play");
}
