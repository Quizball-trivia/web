import { explicitLocaleFromPathname, isLocale, type Locale } from "./locale";
import { storage, STORAGE_KEYS } from "@/utils/storage";

/** A signup started and never finished (an abandoned email link) stops counting after a day. */
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * Signing up leaves the localized address for /auth/callback and /onboarding. The language the visitor was reading waits
 * here, apart from the saved app language, until the account turns out to be new (LocaleProvider applies it then, and
 * drops it for an existing account). Nothing about the app language changes before sign-in succeeds.
 */
export function rememberSignupLocale(): void {
  if (typeof window === "undefined") return;
  const locale = explicitLocaleFromPathname(window.location.pathname);
  if (locale) storage.set(STORAGE_KEYS.SIGNUP_LOCALE, { locale, at: Date.now() });
  else clearSignupLocale();
}

/** Also called when the visitor picks a language themselves. Blocked storage must never stop a sign-in or a render. */
export function clearSignupLocale(): void {
  try {
    storage.remove(STORAGE_KEYS.SIGNUP_LOCALE);
  } catch {
    // Nothing was stored, or nothing can be.
  }
}

/** Reads the pending language once. */
export function takeSignupLocale(): Locale | null {
  const pending = storage.get<{ locale?: string; at?: number } | null>(STORAGE_KEYS.SIGNUP_LOCALE, null);
  clearSignupLocale();
  if (!pending || !isLocale(pending.locale) || typeof pending.at !== "number" || Date.now() - pending.at > MAX_AGE_MS) return null;
  return pending.locale;
}

/**
 * The language an account has chosen: undefined signed out, null for none yet. The column defaults to "en" at signup, and
 * the API does not say whether "en" was picked, so it counts as picked only with the rest of the onboarding profile, which
 * is saved in one request and requires a club, or once onboarding is complete.
 */
export function chosenAccountLanguage(user: { preferred_language: string | null; onboarding_complete: boolean; favorite_club?: string | null } | null | undefined): string | null | undefined {
  if (!user) return undefined;
  if (!user.preferred_language) return null;
  return user.preferred_language !== "en" || user.onboarding_complete || user.favorite_club?.trim() ? user.preferred_language : null;
}
