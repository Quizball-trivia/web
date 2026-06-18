import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "@fontsource/poppins/400.css";
import "@fontsource/poppins/500.css";
import "@fontsource/poppins/600.css";
import "@fontsource/poppins/700.css";
import "@fontsource/poppins/800.css";
import "@fontsource/poppins/900.css";
import "flag-icons/css/flag-icons.min.css";
import { Providers } from "./providers";
import { SITE_URL, SITE_NAME, SITE_TAGLINE, SITE_DESCRIPTION, IS_PRODUCTION_DEPLOYMENT } from "@/lib/seo/site";
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
    locale: "en_US",
    alternateLocale: ["ka_GE"],
    images: [
      {
        url: "/assets/brand/quziball-logo-2.png",
        width: 1200,
        height: 1200,
        alt: `${SITE_NAME} logo`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    images: ["/assets/brand/quziball-logo-2.png"],
  },
  icons: {
    icon: "/assets/brand/quziball-logo-2.png",
    shortcut: "/assets/brand/quziball-logo-2.png",
    apple: "/assets/brand/quziball-logo-2.png",
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
    logo: `${SITE_URL}/assets/brand/quziball-logo-2.png`,
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
    image: `${SITE_URL}/assets/brand/quziball-logo-2.png`,
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
        <Providers initialLocale={explicitLocale} geoCountry={geoCountry} cspNonce={cspNonce}>{children}</Providers>
      </body>
    </html>
  );
}
