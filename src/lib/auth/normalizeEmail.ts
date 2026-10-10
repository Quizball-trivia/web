/** Formatting only; validation remains in validation.ts and loads with the auth form. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
