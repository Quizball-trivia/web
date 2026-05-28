import AppAuthGate from "@/components/auth/AppAuthGate";
import { AppShell } from "@/components/layout/AppShell";
import { APP_ROUTE_METADATA } from "@/lib/seo/app-routes";

// Cascades noindex,nofollow to every app route (/play, /profile, /settings,
// /leaderboard, /store, ...) so they stop inheriting the root layout's
// index,follow + canonical:"/". See src/lib/seo/app-routes.ts.
export const metadata = APP_ROUTE_METADATA;

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AppAuthGate>
      <AppShell>{children}</AppShell>
    </AppAuthGate>
  );
}
