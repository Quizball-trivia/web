export const SITE_NAME = "Quizball";

export const SITE_TAGLINE = "The 1v1 Football Trivia Game";

export const SITE_DESCRIPTION =
  "Quizball is a fast-paced football trivia game. Challenge friends to 1v1 multiplayer football quiz duels, climb the ranked leaderboard, and prove you know the beautiful game.";

// Canonical production URL. Hardcoded so Vercel preview/branch deploys
// can never leak `*.vercel.app` into canonical/sitemap/OpenGraph URLs.
// NEXT_PUBLIC_SITE_URL is honored as an override for self-hosting.
const rawUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://quizball.io";

export const SITE_URL = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;

// True only on the actual production deployment. Vercel sets VERCEL_ENV to
// "production" | "preview" | "development" at build time; any other value
// (including missing, i.e. local builds) must NOT be indexable so preview
// deployments and local dev servers never leak into search engines.
export const IS_PRODUCTION_DEPLOYMENT = process.env.VERCEL_ENV === "production";
