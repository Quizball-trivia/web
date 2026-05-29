import AppAuthGate from "@/components/auth/AppAuthGate";
import { APP_ROUTE_METADATA } from "@/lib/seo/app-routes";

// Cascades noindex,nofollow to /game and the other fullscreen runtime routes.
// See src/lib/seo/app-routes.ts.
export const metadata = APP_ROUTE_METADATA;

export default function FullscreenLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AppAuthGate>
      <div className="min-h-dvh w-full bg-background">{children}</div>
    </AppAuthGate>
  );
}
