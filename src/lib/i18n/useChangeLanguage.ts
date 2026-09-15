"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useLocale } from "@/contexts/LocaleContext";
import { trackLanguageSwitched } from "@/lib/analytics/game-events";
import { updateMe } from "@/lib/api/endpoints";
import type { Locale } from "@/lib/i18n/locale";
import { useAuthStore } from "@/stores/auth.store";

/**
 * Change the app language in place: switch the UI immediately, persist the
 * preference on the profile when signed in, revert if that save fails.
 * Shared by Settings and the shell's language switcher.
 */
// Shared across instances (Settings and the shell can both be mounted): one in-place change at a time.
let saveInFlight = false;
// Preference saves for navigating selections run in order, so the last choice is the one left on the profile.
let preferenceQueue: Promise<void> = Promise.resolve();

export function useChangeLanguage() {
  const { locale, setLocale, t } = useLocale();
  const { user, setAuthenticated } = useAuthStore();
  const [isSaving, setIsSaving] = useState(false);

  const changeLanguage = useCallback(async (newLocale: Locale) => {
    if (saveInFlight || newLocale === locale) return;
    const previous = locale;
    trackLanguageSwitched(previous, newLocale);
    saveInFlight = true;
    setIsSaving(true);
    setLocale(newLocale);
    try {
      if (user) {
        const updated = await updateMe({ preferred_language: newLocale });
        setAuthenticated({ ...user, preferred_language: updated.preferred_language ?? newLocale });
      }
      toast.success(t("settings.languageUpdated"));
    } catch {
      setLocale(previous);
      toast.error(t("settings.languageUpdateFailed"));
    } finally {
      saveInFlight = false;
      setIsSaving(false);
    }
  }, [locale, setLocale, t, user, setAuthenticated]);

  /**
   * For a selection that navigates to a localized URL (public pages): the page itself changes
   * the UI language, so only the profile preference is saved — no in-place switch, no rollback
   * (a rollback would fight the new URL). Saves run in order; a failure leaves the previous preference.
   */
  const savePreference = useCallback((newLocale: Locale) => {
    const current = useAuthStore.getState().user;
    if (!current) return Promise.resolve();
    preferenceQueue = preferenceQueue.then(async () => {
      try {
        const updated = await updateMe({ preferred_language: newLocale });
        const latest = useAuthStore.getState().user;
        if (latest) setAuthenticated({ ...latest, preferred_language: updated.preferred_language ?? newLocale });
      } catch {
        // The URL already carries the new language; Settings can retry the preference.
      }
    });
    return preferenceQueue;
  }, [setAuthenticated]);

  return { changeLanguage, savePreference, isSaving };
}
