/** Missing or malformed configuration stays on the original immutable artwork. */
export function wordMobileBackgroundEnabled(env: Record<string, string | undefined>, partner: string | null): boolean {
  return env.QB_EXPERIMENTAL_WORD_BACKGROUND === "1"
    && env.VERCEL_ENV === "preview"
    && env.VERCEL_GIT_COMMIT_REF === "staging"
    && env.QB_EXPERIMENTAL_STARTUP_REQUEST_LIMIT === "0"
    && env.QB_EXPERIMENTAL_LOCALE_ASSET_SEED === "0"
    && partner === null;
}
