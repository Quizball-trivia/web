import type { Metadata } from "next";
import "@fontsource-variable/nunito";
import { Providers } from "./providers";
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
      </body>
    </html>
  );
}
