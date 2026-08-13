import { notFound } from "next/navigation";
import { APP_ROUTE_METADATA } from "@/lib/seo/app-routes";
import { IS_PRODUCTION_DEPLOYMENT } from "@/lib/seo/site";
import { DemoLocaleDefault } from "@/features/demos/DemoLocaleDefault";

// Investor demo playground — fully client-driven, no auth, no backend.
// Never available on the production deployment unless explicitly enabled.
export const metadata = APP_ROUTE_METADATA;

export default function DemosLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  if (IS_PRODUCTION_DEPLOYMENT && process.env.DEMOS_ROUTE_ENABLED !== "true") {
    notFound();
  }

  return (
    <div className="min-h-dvh w-full bg-background">
      <DemoLocaleDefault />
      {/* Same fixed page background as the app shell (/play etc.). */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-surface-page-alt bg-[url('/assets/bg-pattern.webp')] bg-cover bg-center bg-no-repeat"
      />
      <div className="relative">{children}</div>
    </div>
  );
}
