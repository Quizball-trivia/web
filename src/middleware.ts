import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LOCALE } from "@/lib/i18n/locale";
import { DAILY_CHALLENGE_SLUGS } from "@/lib/domain/dailyChallengeSlugs";
import { GAME_PAGES } from "@/lib/seo/game-pages";
import { API_BASE_URL } from "@/lib/config";
import type { CampaignQuizRoute } from "@/features/campaign-quiz/campaignQuiz.types";

// Routes that must redirect to the default-locale variant. Only marketing/legal
// pages are localized; everything else (app, auth, game) is intentionally
// locale-less and stays unchanged.
const REDIRECT_FROM_ROOT: Record<string, string> = {
  // "/" is served by the Play page in place (see the rewrite below), so the
  // bare domain is the homepage for guests, players and search engines alike.
  "/daily": `/${DEFAULT_LOCALE}/daily`,
  "/games": `/${DEFAULT_LOCALE}/games`,
  "/about": `/${DEFAULT_LOCALE}/about`,
  "/terms": `/${DEFAULT_LOCALE}/terms`,
  "/privacy": `/${DEFAULT_LOCALE}/privacy`,
  // Bare game landing URLs → default-locale variant (indexable pages).
  ...Object.fromEntries(
    GAME_PAGES.map((page) => [`/${page.section}/${page.slug}`, `/${DEFAULT_LOCALE}/${page.section}/${page.slug}`]),
  ),
  // Legacy camelCase game routes (old links, bookmarks) → public slugs.
  ...Object.fromEntries(
    Object.entries(DAILY_CHALLENGE_SLUGS)
      // Types whose slug equals the type (imposter, countdown) would redirect to themselves.
      .filter(([type, slug]) => type !== slug)
      .map(([type, slug]) => [`/daily/challenges/${type}`, `/daily/challenges/${slug}`]),
  ),
};

function originFromEnv(name: string): string | null {
  const value = process.env[name]?.trim();
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function buildCsp(nonce: string): string {
  const isDevelopment = process.env.NODE_ENV === "development";
  const apiOrigin = originFromEnv("NEXT_PUBLIC_API_URL");
  const supabaseOrigin = originFromEnv("NEXT_PUBLIC_SUPABASE_URL");
  const posthogOrigin = originFromEnv("NEXT_PUBLIC_POSTHOG_HOST");
  const connectSrc = Array.from(new Set([
    "'self'",
    apiOrigin,
    supabaseOrigin,
    posthogOrigin,
    "https://us.i.posthog.com",
    "https://app.posthog.com",
    "https://*.posthog.com",
    "https://accounts.google.com",
    "https://www.googleapis.com",
    "https://graph.facebook.com",
    "https://api-js.mixpanel.com",
    "https://vitals.vercel-insights.com",
    "wss:",
    "ws:",
  ].filter(Boolean)));
  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    "https:",
    // dotlottie's player compiles a wasm module (auction search animation);
    // wasm-unsafe-eval permits only WebAssembly.compile, not JS eval.
    "'wasm-unsafe-eval'",
    isDevelopment ? "'unsafe-eval'" : null,
    isDevelopment ? "'unsafe-inline'" : null,
  ].filter(Boolean);

  return [
    "default-src 'self'",
    "base-uri 'none'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    `script-src ${scriptSrc.join(" ")}`,
    `connect-src ${connectSrc.join(" ")}`,
    "frame-src 'self' https://accounts.google.com https://*.facebook.com https://www.facebook.com https://www.youtube-nocookie.com",
    "worker-src 'self' blob:",
    "media-src 'self' blob: data: https:",
    "manifest-src 'self'",
  ].join("; ");
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const nonce = generateNonce();
  const csp = buildCsp(nonce);
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", pathname);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  // The bare domain IS the Play page: rewrite (not redirect) so the URL stays
  // "/" — guests get the signed-out state, players the app, crawlers the
  // server-rendered guest page with a canonical of "/".
  if (pathname === "/") {
    const url = req.nextUrl.clone();
    url.pathname = "/play";
    const res = NextResponse.rewrite(url, { request: { headers: requestHeaders } });
    res.headers.set("Content-Security-Policy", csp);
    return res;
  }

  const redirectTarget = REDIRECT_FROM_ROOT[pathname];
  if (redirectTarget) {
    const url = req.nextUrl.clone();
    // Geo-aware landing locale: send visitors physically in Georgia to /ka,
    // everyone else to the default (/en). Only the bare entry routes here are
    // affected; an explicit /en or /ka URL is never rewritten.
    const country =
      req.headers.get("x-vercel-ip-country")?.trim().toUpperCase() ?? "";
    const landingLocale = country === "GE" ? "ka" : DEFAULT_LOCALE;
    url.pathname = redirectTarget.replace(`/${DEFAULT_LOCALE}`, `/${landingLocale}`);
    const res = NextResponse.redirect(url, 308);
    res.headers.set("Content-Security-Policy", csp);
    res.headers.set("x-pathname", url.pathname);
    return res;
  }

  // Slug changes and retired CMS quiz pages are resolved before Next renders.
  // This is the only reliable way to return a real 410 (rather than a themed
  // 404 page) while keeping redirects locale-aware.
  const quizPath = pathname.match(/^\/(en|ka)\/football-quiz\/([a-z0-9]+(?:-[a-z0-9]+)*)$/);
  if (
    quizPath
    && !req.nextUrl.searchParams.has('preview')
    && (req.method === 'GET' || req.method === 'HEAD')
  ) {
    try {
      const response = await fetch(
        `${API_BASE_URL.replace(/\/+$/, '')}/api/v1/campaign-quizzes/routes/${encodeURIComponent(quizPath[2])}`,
        {
          headers: { Accept: 'application/json' },
          cache: 'no-store',
          signal: AbortSignal.timeout(1_000),
        },
      );
      if (response.ok) {
        const route = await response.json() as CampaignQuizRoute;
        if (route.kind === 'redirect' && route.target_slug) {
          const url = req.nextUrl.clone();
          url.pathname = `/${quizPath[1]}/football-quiz/${route.target_slug}`;
          const redirectResponse = NextResponse.redirect(url, 301);
          redirectResponse.headers.set('Content-Security-Policy', csp);
          return redirectResponse;
        }
        if (route.kind === 'gone') {
          return new NextResponse(
            '<!doctype html><html lang="en"><head><title>Quiz no longer available</title></head><body><main><h1>This quiz is no longer available.</h1></main></body></html>',
            {
            status: 410,
            headers: {
              'Content-Type': 'text/html; charset=utf-8',
              'Content-Security-Policy': csp,
              'X-Robots-Tag': 'noindex, follow',
            },
            },
          );
        }
      }
    } catch {
      // A route lookup outage must not take down otherwise valid quiz pages;
      // the App Router still performs the authoritative page fetch below.
    }
  }

  // Expose the request path to the root layout so it can set <html lang>
  // correctly. headers() in App Router can't see the request URL on its own.
  // Pathname only — localeFromPathname only inspects the first segment so
  // including the query string would just be noise.
  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set("Content-Security-Policy", csp);
  res.headers.set("x-pathname", pathname);
  res.headers.set("x-nonce", nonce);
  return res;
}

export const config = {
  // Skip Next internals and static files. We still match /, /about, /terms,
  // /privacy for redirects, and all other routes for the x-pathname header.
  matcher: ["/((?!_next/|api/|.*\\..*).*)"],
};
