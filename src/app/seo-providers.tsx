"use client";

import { usePathname } from "next/navigation";
import { PostHogPageView } from "@/components/PostHogProvider";
import { localeFromPathname } from "@/lib/i18n/locale";
import { useDocumentLanguage } from "@/lib/i18n/useDocumentLanguage";

/**
 * Public quiz routes do not need the authenticated app's query, player,
 * theme, socket, or toast providers. Keeping their client boundary lean cuts
 * the JavaScript shipped to organic-search visitors while preserving pageview
 * and scoped session-replay analytics.
 */
export function SeoProviders({ children }: { children: React.ReactNode }) {
  // Arriving here by client navigation from the app keeps the app's <html lang>; these pages are in the address's.
  useDocumentLanguage(localeFromPathname(usePathname() ?? "/"));
  return (
    <>
      <PostHogPageView />
      {children}
    </>
  );
}
