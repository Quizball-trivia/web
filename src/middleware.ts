import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/locale";
import { DAILY_CHALLENGE_SLUGS } from "@/lib/domain/dailyChallengeSlugs";
import { PUBLIC_GAMES_FOLDER, dailyCollectionPath, gamePageSlug, previousGamePagePaths } from "@/lib/seo/game-pages";
import { PUBLISHED_PUBLIC_GAMES } from "@/lib/seo/public-games";
import { API_BASE_URL } from "@/lib/config";
import { canAccessDemos } from "@/lib/demos-access";
import { isPartnerNamespacePath, partnerBasePath, partnerFromHost, type PartnerSlug } from "@/features/partner/partnerHosts";
import { partnerFrameAncestors } from "@/features/partner/partnerOrigins";
import { PARTNER_LAUNCH_TOKEN_PARAM } from "@/features/partner/partnerLaunchToken";
import type { CampaignQuizRoute } from "@/features/campaign-quiz/campaignQuiz.types";

// Routes that must redirect to the default-locale variant. Only marketing/legal
// pages are localized; everything else (app, auth, game) is intentionally
// locale-less and stays unchanged.
const REDIRECT_FROM_ROOT: Record<string, string> = {
  // The locale homepage IS the Football Games hub; bare marketing paths go to the default locale.
  "/daily": dailyCollectionPath(DEFAULT_LOCALE),
  "/games": `/${DEFAULT_LOCALE}`,
  "/football-games": `/${DEFAULT_LOCALE}`,
  "/about": `/${DEFAULT_LOCALE}/about`,
  "/terms": `/${DEFAULT_LOCALE}/terms`,
  "/privacy": `/${DEFAULT_LOCALE}/privacy`,
  "/download": `/${DEFAULT_LOCALE}/download`,
  // Bare game page URLs → default-locale variant (indexable pages).
  ...Object.fromEntries(
    PUBLISHED_PUBLIC_GAMES.map((page) => [
      `/${PUBLIC_GAMES_FOLDER[DEFAULT_LOCALE]}/${gamePageSlug(page, DEFAULT_LOCALE)}`,
      `/${DEFAULT_LOCALE}/${PUBLIC_GAMES_FOLDER[DEFAULT_LOCALE]}/${gamePageSlug(page, DEFAULT_LOCALE)}`,
    ]),
  ),
  // Legacy camelCase game routes (old links, bookmarks) → public slugs.
  ...Object.fromEntries(
    Object.entries(DAILY_CHALLENGE_SLUGS)
      // Types whose slug equals the type (imposter, countdown) would redirect to themselves.
      .filter(([type, slug]) => type !== slug)
      .map(([type, slug]) => [`/daily/challenges/${type}`, `/daily/challenges/${slug}`]),
  ),
  // Card Detective replaces the retired FIFA Cards runtime. Keep old bookmarks
  // on a playable game; its public marketing page has a separate route.
  "/daily/challenges/fifaCards": "/daily/challenges/card-detective",
  "/daily/challenges/guess-the-card": "/daily/challenges/card-detective",
  // Google sends "buscaminas futbolero" searches to this URL; that intent is the
  // player-card game, so it now lives there. Trivia Mines moved to minas-con-preguntas.
  "/es/juegos-de-futbol/minas-de-trivia": "/es/juegos-de-futbol/buscaminas-futbolero",
  // Renamed pages (searched names, 2026-09-30): old ES slugs and the old TR folder.
  ...previousGamePagePaths(PUBLISHED_PUBLIC_GAMES),
};

const GAME_FOLDERS = new Set(Object.values(PUBLIC_GAMES_FOLDER));

// Next decodes route params, so /tr/football-games/%61uction used to render; match its redirect too.
function decodedPath(pathname: string): string {
  try {
    return decodeURIComponent(pathname);
  } catch {
    return pathname;
  }
}

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

function frameAncestors(pathname: string, partner: PartnerSlug | null, isDevelopment: boolean): string {
  // Only the partner host may be embedded, and only by the partner; next.config drops X-Frame-Options for the same hosts.
  if (partner) return `frame-ancestors ${partnerFrameAncestors().join(" ")}`;
  // Local development only: the games playground frames its own preview page.
  if (isDevelopment && pathname.startsWith("/dev/games/preview")) return "frame-ancestors 'self'";
  return "frame-ancestors 'none'";
}

function buildCsp(nonce: string, pathname = "", partner: PartnerSlug | null = null): string {
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
    frameAncestors(pathname, partner, isDevelopment),
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

/**
 * A partner host serves only its namespace: every path is rewritten under /partner/<slug>, so the Quizball app,
 * the geo/locale redirects and the SEO routes are unreachable from it.
 */
function partnerHostResponse(req: NextRequest, partner: PartnerSlug, nonce: string, csp: string): NextResponse {
  const { pathname } = req.nextUrl;
  const basePath = partnerBasePath(partner);
  const alreadyInNamespace = pathname === basePath || pathname.startsWith(`${basePath}/`);
  const internalPath = alreadyInNamespace ? pathname : `${basePath}${pathname === "/" ? "" : pathname}`;
  const hasLaunchToken = req.nextUrl.searchParams.has(PARTNER_LAUNCH_TOKEN_PARAM);

  // Next serialises the original request URL into the page's Flight data, so the page must never be rendered
  // for a URL that carries the token. Browsers keep a redirect's fragment but never send it to a server or in a
  // Referer; the capture script reads it from there before hydration.
  if (hasLaunchToken && (req.method === "GET" || req.method === "HEAD")) {
    const url = req.nextUrl.clone();
    const token = url.searchParams.get(PARTNER_LAUNCH_TOKEN_PARAM) ?? "";
    url.searchParams.delete(PARTNER_LAUNCH_TOKEN_PARAM);
    url.hash = `${PARTNER_LAUNCH_TOKEN_PARAM}=${encodeURIComponent(token)}`;
    const redirect = NextResponse.redirect(url, 307);
    redirect.headers.set("Content-Security-Policy", csp);
    redirect.headers.set("X-Robots-Tag", "noindex, nofollow");
    redirect.headers.set("Cache-Control", "private, no-store");
    redirect.headers.set("Referrer-Policy", "no-referrer");
    return redirect;
  }

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", internalPath);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  let res: NextResponse;
  if (alreadyInNamespace && !hasLaunchToken) {
    res = NextResponse.next({ request: { headers: requestHeaders } });
  } else {
    // Defensive (non-GET): the render never receives the token as a search param.
    const url = req.nextUrl.clone();
    url.pathname = internalPath;
    url.searchParams.delete(PARTNER_LAUNCH_TOKEN_PARAM);
    res = NextResponse.rewrite(url, { request: { headers: requestHeaders } });
  }
  res.headers.set("Content-Security-Policy", csp);
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  // The launch URL carries a one-time token: never cache it, never send it on in a Referer.
  res.headers.set("Cache-Control", "private, no-store");
  res.headers.set("Referrer-Policy", "no-referrer");
  res.headers.set("x-nonce", nonce);
  return res;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const nonce = generateNonce();
  const partner = partnerFromHost(req.headers.get("host"));
  const csp = buildCsp(nonce, pathname, partner);

  if (partner) return partnerHostResponse(req, partner, nonce, csp);

  if (isPartnerNamespacePath(pathname) || isPartnerNamespacePath(decodedPath(pathname))) {
    return new NextResponse("Not found", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Content-Security-Policy": csp, "X-Robots-Tag": "noindex, nofollow" },
    });
  }

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", pathname);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  // Return a real 404 before streaming; the layout also protects this tree.
  if (pathname === "/demos" || pathname.startsWith("/demos/")) {
    const demoHeaders = {
      "Content-Security-Policy": csp,
      "X-Robots-Tag": "noindex, nofollow",
      "Cache-Control": "private, no-store",
    };
    if (!canAccessDemos(req.headers.get("host"))) {
      return new NextResponse("Not found", { status: 404, headers: demoHeaders });
    }
    return NextResponse.next({ request: { headers: requestHeaders }, headers: demoHeaders });
  }

  // The bare domain sends visitors to their locale homepage (the Football Games
  // hub): Georgia → /ka, everyone else → /en, x-default stays /en. Temporary and
  // uncacheable because the target depends on the visitor's location. Members
  // reach the app through the homepage's "Open play" control or /play directly.
  if (pathname === "/") {
    const url = req.nextUrl.clone();
    const country = req.headers.get("x-vercel-ip-country")?.trim().toUpperCase() ?? "";
    url.pathname = `/${country === "GE" ? "ka" : DEFAULT_LOCALE}`;
    const res = NextResponse.redirect(url, 307);
    res.headers.set("Content-Security-Policy", csp);
    res.headers.set("Cache-Control", "private, no-store");
    return res;
  }

  const redirectTarget = REDIRECT_FROM_ROOT[pathname] ?? REDIRECT_FROM_ROOT[decodedPath(pathname)];
  if (redirectTarget) {
    const url = req.nextUrl.clone();
    // Geo-aware landing locale: send visitors physically in Georgia to /ka,
    // everyone else to the default (/en). Only the bare entry routes here are
    // affected; an explicit /en or /ka URL is never rewritten.
    // Deterministic: a permanent redirect must not depend on the visitor's
    // location (browsers and caches keep 308s), so aliases always land on the
    // default-locale page; only the bare "/" above is geo-aware.
    url.pathname = redirectTarget;
    const res = NextResponse.redirect(url, 308);
    res.headers.set("Content-Security-Policy", csp);
    res.headers.set("x-pathname", url.pathname);
    return res;
  }

  // A games folder belongs to its own locales (/en|ka/football-games,
  // /es/juegos-de-futbol, /tr/futbol-oyunlari). Other combinations answer 404
  // here, deterministically, instead of relying on a streamed notFound().
  const folderMatch = pathname.match(/^\/(en|ka|es|tr)\/([a-z-]+)(?:\/|$)/);
  if (folderMatch && GAME_FOLDERS.has(folderMatch[2]) && PUBLIC_GAMES_FOLDER[folderMatch[1] as Locale] !== folderMatch[2]) {
    return new NextResponse("Not found", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8", "Content-Security-Policy": csp } });
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
