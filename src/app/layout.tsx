import type { Metadata } from "next";
import "@fontsource-variable/nunito";
import "@fontsource/poppins/600.css";
import { Providers } from "./providers";
import { Analytics } from "@vercel/analytics/next";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "QuizBall",
  description: "QuizBall",
  robots: "noindex, nofollow",
  icons: {
    icon: "/assets/brand/quziball-logo-2.png",
    shortcut: "/assets/brand/quziball-logo-2.png",
    apple: "/assets/brand/quziball-logo-2.png",
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
