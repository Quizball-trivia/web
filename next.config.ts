import type { NextConfig } from "next";

// Only the canonical production deployment should be indexable. Vercel
// sets VERCEL_ENV at build time — "production" on quizball.io, "preview"
// on branch deploys, "development" locally. Any other value (including
// missing) gets noindex headers.
const IS_PRODUCTION_DEPLOYMENT = process.env.VERCEL_ENV === "production";

function originFromEnv(name: string): string | null {
  const value = process.env[name]?.trim();
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function buildCspReportOnly(): string {
  const apiOrigin = originFromEnv("NEXT_PUBLIC_API_URL");
  const supabaseOrigin = originFromEnv("NEXT_PUBLIC_SUPABASE_URL");
  const posthogOrigin = originFromEnv("NEXT_PUBLIC_POSTHOG_HOST");
  const connectSrc = [
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
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://apis.google.com https://www.gstatic.com https://connect.facebook.net https://va.vercel-scripts.com https://vercel.live",
    `connect-src ${connectSrc.join(" ")}`,
    "frame-src 'self' https://accounts.google.com https://*.facebook.com https://www.facebook.com",
    "worker-src 'self' blob:",
    "media-src 'self' blob: data: https:",
  ].join("; ");
}

const SECURITY_HEADERS = [
  {
    key: "Content-Security-Policy-Report-Only",
    value: buildCspReportOnly(),
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  images: {
    // Serve AVIF where the browser supports it (smaller than webp at the
    // same visual quality), webp otherwise.
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        // Own Supabase storage (question/category images) — lets the
        // optimizer resize the stored 1440×1080 PNGs down to card size.
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "api.dicebear.com",
      },
      {
        protocol: "https",
        hostname: "*.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "randomuser.me",
      },
      {
        protocol: "https",
        hostname: "ui-avatars.com",
      },
      {
        protocol: "https",
        hostname: "robohash.org",
      },
      {
        protocol: "https",
        hostname: "flagcdn.com",
      },
    ],
  },
  async headers() {
    // Block preview/branch deploys from search indexes even for
    // non-HTML responses (sitemap.xml, JSON, etc.).
    if (IS_PRODUCTION_DEPLOYMENT) {
      return [
        {
          source: "/:path*",
          headers: SECURITY_HEADERS,
        },
      ];
    }
    return [
      {
        source: "/:path*",
        headers: [
          ...SECURITY_HEADERS,
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
};

export default nextConfig;
