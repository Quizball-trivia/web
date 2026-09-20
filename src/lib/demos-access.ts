/** The showcase is available only on the staging domain and local development. */
export function canAccessDemos(host: string | null, nodeEnv = process.env.NODE_ENV): boolean {
  const hostname = host?.toLowerCase().replace(/:\d+$/, "");
  if (hostname === "staging.quizball.io") return true;
  return nodeEnv === "development" && (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]");
}
