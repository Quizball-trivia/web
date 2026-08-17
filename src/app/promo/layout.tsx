import { notFound } from "next/navigation";
import { APP_ROUTE_METADATA } from "@/lib/seo/app-routes";
import { IS_PRODUCTION_DEPLOYMENT } from "@/lib/seo/site";

// Promotional-video quiz — fully client-driven, no auth, no backend.
// Staging/preview only: the production deployment 404s this route unless
// PROMO_ROUTE_ENABLED is explicitly set, mirroring the /demos gate.
export const metadata = APP_ROUTE_METADATA;

export default function PromoLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  if (IS_PRODUCTION_DEPLOYMENT && process.env.PROMO_ROUTE_ENABLED !== "true") {
    notFound();
  }

  return (
    <div className="min-h-dvh w-full bg-background">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-surface-page-alt bg-[url('/assets/bg-pattern.webp')] bg-cover bg-center bg-no-repeat"
      />
      <div className="relative">{children}</div>
    </div>
  );
}
