"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import type { Locale } from "@/lib/i18n/messages";
import type { PartnerSlug } from "@/features/partner/partnerHosts";
import { SeoProviders } from "./seo-providers";
import { isLightweightSeoRoute } from "@/lib/seo/lightweight-routes";

const FullProviders = dynamic(() =>
  import("./providers").then((module) => module.Providers),
);

const PartnerProviders = dynamic(() =>
  import("@/features/partner/PartnerProviders").then((module) => module.PartnerProviders),
);

type RouteProvidersProps = {
  children: React.ReactNode;
  /** Set from the request host; partner hosts get their own tree with no Quizball auth, player or analytics. */
  partner?: PartnerSlug | null;
  isSeoRoute: boolean;
  initialLocale?: Locale;
  geoCountry?: string | null;
  cspNonce?: string;
};

export function RouteProviders({
  children,
  partner,
  isSeoRoute,
  initialLocale,
  geoCountry,
  cspNonce,
}: RouteProvidersProps) {
  const pathname = usePathname();

  if (partner) {
    return <PartnerProviders cspNonce={cspNonce}>{children}</PartnerProviders>;
  }

  // Root layouts persist during App Router navigation. The server prop only
  // describes the first document request, so relying on it after leaving an
  // SEO page can render the signup screen without QueryClientProvider.
  const isCurrentSeoRoute = pathname
    ? isLightweightSeoRoute(pathname)
    : isSeoRoute;

  if (isCurrentSeoRoute) {
    return <SeoProviders>{children}</SeoProviders>;
  }

  // The local games playground renders game components from fixtures: no auth, profile, socket or analytics providers.
  if (process.env.NODE_ENV === "development" && /^\/dev\/games(\/|$)/.test(pathname ?? "")) {
    return <>{children}</>;
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
