/** The showcase is available only on the staging domain and local development. */
export function canAccessDemos(host: string | null, nodeEnv = process.env.NODE_ENV): boolean {
  const hostname = host?.toLowerCase().replace(/:\d+$/, "");
  if (hostname === "staging.quizball.io") return true;
  return nodeEnv === "development" && (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]");
}

/**
 * The game previews the internal HQ shows to the games team: the demo showcase and the games playground (real game
 * screens on bundled sample data: no login, no backend). Same hosts as the showcase: staging and local development.
 */
const GAME_PREVIEW_PATHS = ["/demos", "/dev/games"] as const;
export function isGamePreviewPath(pathname: string): boolean {
  return GAME_PREVIEW_PATHS.some((base) => pathname === base || pathname.startsWith(`${base}/`));
}

/** The only sites that may show a game preview inside a frame: the CMS, where HQ lives. */
export const HQ_FRAME_ORIGINS = ["https://cms.quizball.io", "https://staging-cms.quizball.io"] as const;

/**
 * Who may frame a page, as a CSP source list, or null when this is not a game preview on a host that serves them
 * (every other page stays unframeable). 'self' is for the playground, which frames its own preview page.
 */
export function gamePreviewFrameAncestors(pathname: string, host: string | null, nodeEnv = process.env.NODE_ENV): string | null {
  if (!isGamePreviewPath(pathname) || !canAccessDemos(host, nodeEnv)) return null;
  const local = nodeEnv === "development" ? ["http://localhost:*", "http://127.0.0.1:*"] : [];
  return ["'self'", ...HQ_FRAME_ORIGINS, ...local].join(" ");
}
