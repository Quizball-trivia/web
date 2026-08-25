"use client";

import dynamic from "next/dynamic";
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
  if (isSeoRoute) {
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
