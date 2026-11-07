import type { Metadata } from "next";
import { headers } from "next/headers";
import { localeFromPathname } from "@/lib/i18n/locale";

const MESSAGE: Partial<Record<string, string>> = {
  fr: "Cette page est introuvable.",
  de: "Diese Seite wurde nicht gefunden.",
};

export const metadata: Metadata = { title: "404", robots: { index: false } };

/** Next's own 404 layout, in the language of the address that was asked for. */
export default async function NotFound() {
  const locale = localeFromPathname((await headers()).get("x-pathname") ?? "/");
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", height: "100vh", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 20 }}>
      <h1 style={{ margin: 0, fontSize: 24, fontWeight: 500, lineHeight: "49px" }}>404</h1>
      <p style={{ margin: 0, fontSize: 14 }}>{MESSAGE[locale] ?? "This page could not be found."}</p>
    </div>
  );
}
