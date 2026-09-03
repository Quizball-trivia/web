import { APP_ROUTE_METADATA } from "@/lib/seo/app-routes";

// Temporary prototype area for game-mode concept testing (no auth required so
// testers don't need accounts). Delete this route group together with
// src/features/game-mode-lab/ once the experiment concludes.
export const metadata = APP_ROUTE_METADATA;

export default function GameModeLabLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <div className="min-h-dvh w-full bg-surface-page">{children}</div>;
}
