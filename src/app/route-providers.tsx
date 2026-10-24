"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { Locale } from "@/lib/i18n/messages";
import type { MessageDictionary } from "@/lib/i18n/client-messages";
import type { PartnerSlug } from "@/features/partner/partnerHosts";
import { SeoProviders } from "./seo-providers";
import { isLightweightSeoRoute } from "@/lib/seo/lightweight-routes";

const FullProviders = dynamic(() =>
  import("./providers").then((module) => module.Providers),
);

const PartnerProviders = dynamic(() =>
  import("@/features/partner/PartnerProviders").then((module) => module.PartnerProviders),
);

// Direct imports in each entry keep unrelated locale assets out of startup.
// All entries use the same Providers/contexts, never a separate auth tree.
const LocaleAssetProviders = {
  es: dynamic(() => import("./locale-asset-providers.es").then((module) => module.LocaleAssetProviders)),
  tr: dynamic(() => import("./locale-asset-providers.tr").then((module) => module.LocaleAssetProviders)),
  ka: dynamic(() => import("./locale-asset-providers.ka").then((module) => module.LocaleAssetProviders)),
  ru: dynamic(() => import("./locale-asset-providers.ru").then((module) => module.LocaleAssetProviders)),
  pt: dynamic(() => import("./locale-asset-providers.pt").then((module) => module.LocaleAssetProviders)),
  de: dynamic(() => import("./locale-asset-providers.de").then((module) => module.LocaleAssetProviders)),
};

type RouteProvidersProps = {
  children: React.ReactNode;
  /** Set from the request host; partner hosts get their own tree with no Quizball auth, player or analytics. */
  partner?: PartnerSlug | null;
  isSeoRoute: boolean;
  initialLocale?: Locale;
  initialMessages?: MessageDictionary;
  /** Server-controlled, staging-only experiment; defaults to the original delivery. */
  localeAssetSeed?: boolean;
  geoCountry?: string | null;
  cspNonce?: string;
};

export function RouteProviders({
  children,
  partner,
  isSeoRoute,
  initialLocale,
  initialMessages,
  localeAssetSeed = false,
  geoCountry,
  cspNonce,
}: RouteProvidersProps) {
  const pathname = usePathname();
  // Unconditional hook, including partner/SEO branches. A URL language change
  // must not change the component type and reset queries, sessions or tracking.
  const [entryLocale] = useState(() => localeAssetSeed && initialLocale && initialLocale !== "en" ? initialLocale : null);

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

  const SelectedProviders = entryLocale ? LocaleAssetProviders[entryLocale] : FullProviders;
  return (
    <SelectedProviders
      initialLocale={initialLocale}
      initialMessages={initialMessages}
      geoCountry={geoCountry}
      cspNonce={cspNonce}
    >
      {children}
    </SelectedProviders>
  );
}
