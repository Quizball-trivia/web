export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";

/**
 * Master switch for phone / OTP sign-in. Off by default while phone
 * verification is still being validated — when off, the phone tab and OTP UI
 * are hidden from the auth modal entirely (the availability hook short-circuits
 * to unavailable and skips the backend probe). Flip to "true" via
 * NEXT_PUBLIC_PHONE_AUTH_ENABLED (or change the default below) to re-enable.
 */
export const PHONE_AUTH_ENABLED =
  process.env.NEXT_PUBLIC_PHONE_AUTH_ENABLED === "true";
