import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LOCALE } from "@/lib/i18n/locale";

// Routes that must redirect to the default-locale variant. Only marketing/legal
// pages are localized; everything else (app, auth, game) is intentionally
// locale-less and stays unchanged.
const REDIRECT_FROM_ROOT: Record<string, string> = {
  "/": `/${DEFAULT_LOCALE}`,
  "/about": `/${DEFAULT_LOCALE}/about`,
  "/terms": `/${DEFAULT_LOCALE}/terms`,
  "/privacy": `/${DEFAULT_LOCALE}/privacy`,
};

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  const redirectTarget = REDIRECT_FROM_ROOT[pathname];
  if (redirectTarget) {
    const url = req.nextUrl.clone();
    url.pathname = redirectTarget;
    return NextResponse.redirect(url, 308);
  }

  // Expose the request path to the root layout so it can set <html lang>
  // correctly. headers() in App Router can't see the request URL on its own.
  const res = NextResponse.next();
  res.headers.set("x-pathname", pathname + search);
  return res;
}

export const config = {
  // Skip Next internals and static files. We still match /, /about, /terms,
  // /privacy for redirects, and all other routes for the x-pathname header.
  matcher: ["/((?!_next/|api/|.*\\..*).*)"],
};
