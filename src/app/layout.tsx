import type { Metadata } from "next";
import "@fontsource-variable/nunito";
import "@fontsource/poppins/600.css";
import "flag-icons/css/flag-icons.min.css";
import { Providers } from "./providers";
import { Analytics } from "@vercel/analytics/next";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "QuizBall",
  description: "QuizBall",
  // Allow search engines to index + follow links. Earlier we emitted
  // `noindex, nofollow` site-wide which prevented every page from
  // appearing in Google Search results ("No page information" snippet).
  robots: "index, follow",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="antialiased" style={{ fontFamily: "'Nunito Variable', sans-serif" }}>
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
