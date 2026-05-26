import type { NextConfig } from "next";

// Only the canonical production deployment should be indexable. Vercel
// sets VERCEL_ENV at build time — "production" on quizball.io,
// "preview" on branch deploys, "development" locally.
const IS_PRODUCTION_DEPLOYMENT =
  process.env.VERCEL_ENV === undefined || process.env.VERCEL_ENV === "production";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
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
    if (IS_PRODUCTION_DEPLOYMENT) return [];
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
};

export default nextConfig;
