import type { Metadata } from "next";
import { APP_ROUTE_METADATA } from "@/lib/seo/app-routes";

/**
 * The Play screen is the app, not a landing page: noindex on every deployment.
 * The public entry points are the locale homepages (/en, /ka, /es) and the
 * public game pages; robots.txt keeps /play crawlable so the noindex is seen.
 */
export const metadata: Metadata = APP_ROUTE_METADATA;

export default function PlayLayout({ children }: { children: React.ReactNode }) {
  return children;
}
