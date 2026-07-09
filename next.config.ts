import type { NextConfig } from "next";

// Only the canonical production deployment should be indexable. Vercel
// sets VERCEL_ENV at build time — "production" on quizball.io, "preview"
// on branch deploys, "development" locally. Any other value (including
// missing) gets noindex headers.
const IS_PRODUCTION_DEPLOYMENT = process.env.VERCEL_ENV === "production";

const SECURITY_HEADERS = [
  // CSP is generated in middleware so scripts can use a per-request nonce.
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin-allow-popups",
  },
  {
    key: "Cross-Origin-Resource-Policy",
    value: "same-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  productionBrowserSourceMaps: true,
  images: {
    // Serve AVIF where the browser supports it (smaller than webp at the
    // same visual quality), webp otherwise.
    formats: ["image/avif", "image/webp"],
    // Local assets may carry a cache-busting query (e.g. /assets/coin-1.png?v=2
    // after an in-place asset regeneration). Omitting `search` allows any query.
    localPatterns: [{ pathname: "/**" }],
    // Whitelist the explicit qualities used by lib/images/remoteImage.ts.
    qualities: [70, 75, 90],
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
