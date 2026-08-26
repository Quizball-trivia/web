"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import type { Locale } from "@/lib/i18n/messages";
import { SeoProviders } from "./seo-providers";

const FullProviders = dynamic(() =>
  import("./providers").then((module) => module.Providers),
);

type RouteProvidersProps = {
  children: React.ReactNode;
  isSeoRoute: boolean;
  initialLocale?: Locale;
  geoCountry?: string | null;
  cspNonce?: string;
};

export function RouteProviders({
  children,
  isSeoRoute,
  initialLocale,
  geoCountry,
  cspNonce,
}: RouteProvidersProps) {
  const pathname = usePathname();
  // Root layouts persist during App Router navigation. The server prop only
  // describes the first document request, so relying on it after leaving an
  // SEO page can render the signup screen without QueryClientProvider.
  const isCurrentSeoRoute = pathname
    ? /^\/(en|ka)\/football-quiz(?:\/[^/]+)?\/?$/.test(pathname)
    : isSeoRoute;

  if (isCurrentSeoRoute) {
    return <SeoProviders>{children}</SeoProviders>;
  }

  return (
    <FullProviders
      initialLocale={initialLocale}
      geoCountry={geoCountry}
      cspNonce={cspNonce}
    >
      {children}
    </FullProviders>
  );
}
