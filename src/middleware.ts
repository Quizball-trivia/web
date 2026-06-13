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
    "frame-src 'self' https://accounts.google.com https://*.facebook.com https://www.facebook.com",
    "worker-src 'self' blob:",
    "media-src 'self' blob: data: https:",
    "manifest-src 'self'",
  ].join("; ");
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const nonce = generateNonce();
  const csp = buildCsp(nonce);
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", pathname);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const redirectTarget = REDIRECT_FROM_ROOT[pathname];
  if (redirectTarget) {
    const url = req.nextUrl.clone();
    url.pathname = redirectTarget;
    const res = NextResponse.redirect(url, 308);
    res.headers.set("Content-Security-Policy", csp);
    res.headers.set("x-pathname", pathname);
    return res;
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
