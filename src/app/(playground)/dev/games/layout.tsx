import "@/styles/application-utilities.css";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { canAccessDemos } from "@/lib/demos-access";

/**
 * Staging and local development only, like the demo showcase: real game screens on bundled sample data, for the games
 * team (HQ shows it inside the CMS). It never renders on the production site.
 */
export default async function GamesPlaygroundLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  if (!canAccessDemos((await headers()).get("host"))) notFound();
  return children;
}
