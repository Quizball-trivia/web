import type { Metadata } from "next";
import "@fontsource-variable/nunito";
import { Providers } from "./providers";
import { Analytics } from "@vercel/analytics/next";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "QuizBall",
  description: "QuizBall",
  robots: "noindex, nofollow",
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
