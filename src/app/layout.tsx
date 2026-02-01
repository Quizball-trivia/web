import type { Metadata } from "next";
import { Providers } from "@/components/Providers";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "QuizBall",
  description: "QuizBall",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
