import { isLocale, type Locale } from "@/lib/i18n/locale";
import { PUBLIC_GAMES_FOLDER } from "@/lib/seo/game-pages";

/**
 * The Play screen is the hub for members (/play) and for signed-out visitors
 * (/en, /ka, /es). These helpers are the single place that knows which paths
 * belong to that public surface, so the auth gate, the shell chrome and the
 * nav active state agree.
 */
export const hubPath = (locale: Locale): string => `/${locale}`;

const segmentsOf = (pathname: string): string[] => pathname.split("/").filter(Boolean);

/** `/en` → "en"; anything else → null. */
export function hubLocaleOf(pathname: string | null | undefined): Locale | null {
  if (!pathname) return null;
  const segments = segmentsOf(pathname);
  return segments.length === 1 && isLocale(segments[0]) ? segments[0] : null;
}

export const isHubPath = (pathname: string | null | undefined): boolean => hubLocaleOf(pathname) !== null;

/** `/{locale}/{games folder}/...` — the public game pages and the daily collection. */
export function isPublicGamePath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const segments = segmentsOf(pathname);
  return segments.length >= 2 && isLocale(segments[0]) && segments[1] === PUBLIC_GAMES_FOLDER[segments[0]];
}

/** Locale of the public surface the visitor is on, if any. */
export function publicLocaleOf(pathname: string | null | undefined): Locale | null {
  const hub = hubLocaleOf(pathname);
  if (hub) return hub;
  if (!isPublicGamePath(pathname)) return null;
  const first = segmentsOf(pathname ?? "")[0];
  return isLocale(first) ? first : null;
}

/** Routes a signed-out visitor may browse; every auth-gated action there opens the sign-in dialog. */
export function isGuestAllowedPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  if (pathname === "/" || pathname === "/play") return true;
  if (pathname === "/leaderboard" || pathname === "/events" || pathname === "/weekend-league") return true;
  return isHubPath(pathname) || isPublicGamePath(pathname);
}

/** Paths where the nav highlights "Play". */
export const isPlaySurface = (pathname: string | null | undefined): boolean =>
  pathname === "/play" || isHubPath(pathname) || isPublicGamePath(pathname);
