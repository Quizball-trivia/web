import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { APP_ROUTE_METADATA } from "@/lib/seo/app-routes";
import { partnerFromHost } from "@/features/partner/partnerHosts";
import { PartnerShell } from "@/features/partner/components/PartnerShell";

export const metadata: Metadata = {
  ...APP_ROUTE_METADATA,
  title: { absolute: "Freecroco · Quizball" },
};

// Edge-to-edge in the app WebView; the shell pads itself with the safe-area insets.
export const viewport: Viewport = { viewportFit: "cover" };

export default async function FreecrocoLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Middleware already 404s this namespace elsewhere; this keeps the tree closed if that ever changes.
  if (partnerFromHost((await headers()).get("host")) !== "freecroco") notFound();
  return <PartnerShell>{children}</PartnerShell>;
}
