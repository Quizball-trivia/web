function nonBlank(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : fallback;
}

export const API_BASE_URL = nonBlank(
  process.env.NEXT_PUBLIC_API_URL,
  "http://localhost:8001",
);

/**
 * Master switch for phone / OTP sign-in. When on, the phone tab/OTP UI appears
 * in the auth modal AND the availability hook probes the backend (phone auth is
 * further gated to Georgian users server-side via GeoIP). When off, the phone
 * UI is hidden entirely and no backend probe runs.
 *
 * ON for now — being tested on staging. Flip to `false` to hide.
 */
export const PHONE_AUTH_ENABLED = true;

export const MATCH_STAGE_PRESENCE_ENABLED =
  process.env.NEXT_PUBLIC_MATCH_STAGE_PRESENCE_ENABLED === "true" ||
  process.env.NEXT_PUBLIC_MATCH_STAGE_PRESENCE_ENABLED === "1";
