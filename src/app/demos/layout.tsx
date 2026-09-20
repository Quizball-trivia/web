import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { APP_ROUTE_METADATA } from "@/lib/seo/app-routes";
import { canAccessDemos } from "@/lib/demos-access";
import { DemoLocaleDefault } from "@/features/demos/DemoLocaleDefault";

// Investor demo playground — fully client-driven, no auth, no backend.
// Only the staging domain and local development can render this route tree.
export const metadata = APP_ROUTE_METADATA;

export default async function DemosLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  if (!canAccessDemos((await headers()).get("host"))) {
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
