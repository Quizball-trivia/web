// Dev-team allowlist. Accounts whose email is listed in
// NEXT_PUBLIC_DEV_UNLIMITED_EMAILS (comma-separated) get the store UI treated as
// unlimited: ticket cap and coin-affordability checks are skipped so the buy
// buttons stay enabled. The backend grants the matching bypass for these same
// emails (DEV_UNLIMITED_EMAILS) — this is purely cosmetic so the UI agrees.
// Matched case-insensitively.
const devUnlimitedEmails = new Set(
  (process.env.NEXT_PUBLIC_DEV_UNLIMITED_EMAILS ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean),
);

export function isUnlimitedDevEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return devUnlimitedEmails.has(email.trim().toLowerCase());
}
