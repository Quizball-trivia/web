import { notFound, redirect } from "next/navigation";
import { isLocale } from "@/lib/i18n/locale";

// The Play page served at "/" is the homepage for everyone. Locale roots only
// exist to catch old links and browser-cached 308s from the retired landing
// ("/" → "/en|/ka"). They must land on /play, not "/": a browser replaying the
// cached redirect would otherwise bounce "/" → "/en" → "/" forever.
export default async function LocalizedRoot({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  redirect("/play");
}
