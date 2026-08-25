import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "@fontsource/poppins/400.css";
import "@fontsource/poppins/500.css";
import "@fontsource/poppins/600.css";
import "@fontsource/poppins/700.css";
import "@fontsource/poppins/800.css";
import "@fontsource/poppins/900.css";
import "flag-icons/css/flag-icons.min.css";
import { RouteProviders } from "./route-providers";
import {
  SITE_URL,
  SITE_NAME,
  SITE_TAGLINE,
  SITE_DESCRIPTION,
  SITE_ICON_PATH,
  SITE_OG_IMAGE_ALT,
  SITE_OG_IMAGE_PATH,
  IS_PRODUCTION_DEPLOYMENT,
} from "@/lib/seo/site";
import { explicitLocaleFromPathname, localeFromPathname } from "@/lib/i18n/locale";
import "../styles/globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "games",
  // Only the production deployment (quizball.io) should be indexed.
  // Preview/branch deployments at *.vercel.app emit noindex so Google
  // doesn't surface them as duplicate content.
  robots: IS_PRODUCTION_DEPLOYMENT
    ? {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          "max-image-preview": "large",
          "max-snippet": -1,
          "max-video-preview": -1,
        },
      }
    : {
        index: false,
        follow: false,
      },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    locale: "en_GB",
    alternateLocale: ["ka_GE"],
    images: [
      {
        url: SITE_OG_IMAGE_PATH,
        width: 1200,
        height: 630,
        alt: SITE_OG_IMAGE_ALT,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    images: [SITE_OG_IMAGE_PATH],
  },
  icons: {
    icon: SITE_ICON_PATH,
    shortcut: SITE_ICON_PATH,
    apple: SITE_ICON_PATH,
  },
  // Google Search Console / OAuth brand verification. Next.js renders
  // this as `<meta name="google-site-verification" content="..." />`
  // inside <head> on every page — Search Console only checks the home
  // page, but rendering it everywhere is harmless and keeps the tag in
  // place if someone later moves the index route.
  //
  // Don't remove this even after verification succeeds — Google
  // re-checks periodically and will revoke verification if the tag
  // disappears.
  verification: {
    google: "2ELGPt8HCqKUoe3dQWvBicT93KE2GYGfrAUaTLWk2m4",
  },
};

export const viewport: Viewport = {
  themeColor: "#1645FF",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}${SITE_ICON_PATH}`,
    sameAs: [],
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    inLanguage: ["en", "ka"],
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/social?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    image: `${SITE_URL}${SITE_OG_IMAGE_PATH}`,
    applicationCategory: "GameApplication",
    genre: ["Trivia", "Sports", "Football", "Quiz", "Multiplayer"],
    operatingSystem: "Web, iOS, Android",
    inLanguage: ["en", "ka"],
    keywords: "football trivia, football quiz, soccer quiz, multiplayer football game",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
  },
];

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Derive <html lang> from URL so /ka/* routes get lang="ka" server-side
  // without forcing the entire app under [locale]. middleware.ts sets
  // x-pathname so we can read it here (Next doesn't expose the request URL
  // to the root layout otherwise).
  const headerList = await headers();
  const pathname = headerList.get("x-pathname") ?? "/";
  const cspNonce = headerList.get("x-nonce") ?? undefined;
  const locale = localeFromPathname(pathname);
  // Only URL-prefixed marketing/legal routes should seed the client locale.
  // App routes like /store and /play must hydrate from saved user choice.
  const explicitLocale = explicitLocaleFromPathname(pathname);
  // IP country (set by Vercel's edge). Threaded to the locale provider as a
  // geo signal so first-time visitors in Georgia default to Georgian — without
  // overriding a saved choice, account preference, or explicit URL locale.
  const geoCountry = headerList.get("x-vercel-ip-country");
  const isFootballQuizRoute = /^\/(en|ka)\/football-quiz(?:\/[^/]+)?\/?$/.test(pathname);

  return (
    <html lang={locale} className="dark" suppressHydrationWarning>
      <body
        className="antialiased"
        style={{ fontFamily: "'Poppins', sans-serif" }}
        suppressHydrationWarning
      >
        {/* JSON-LD in <body> not <head> to avoid hydration collision with Messenger's pcm.js injection. */}
        <script
          nonce={cspNonce}
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <RouteProviders
          isSeoRoute={isFootballQuizRoute}
          initialLocale={explicitLocale}
          geoCountry={geoCountry}
          cspNonce={cspNonce}
        >
          {children}
        </RouteProviders>
      </body>
    </html>
  );
}
