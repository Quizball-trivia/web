import { notFound, permanentRedirect } from "next/navigation";
import { isLocale } from "@/lib/i18n/locale";

// The Play page served at "/" is the homepage for everyone. Locale roots only
// exist to catch old links and cached redirects from the previous landing.
export default async function LocalizedRoot({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  permanentRedirect("/");
}
