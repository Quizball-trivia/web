"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useLocale } from "@/contexts/LocaleContext";
import { trackLanguageSwitched } from "@/lib/analytics/game-events";
import { updateMe } from "@/lib/api/endpoints";
import type { Locale } from "@/lib/i18n/locale";
import { useAuthStore } from "@/stores/auth.store";

// Shared across instances (Settings and the shell can both be mounted): one in-place change at a time.
let changeInFlight = false;
// Every profile save, from either path, runs through one ordered queue so the last choice is the one
// left on the profile. Each entry is bound to the account that made it and is skipped if the session
// changed meanwhile (never writes with, or patches the store of, a different account).
let persistQueue: Promise<unknown> = Promise.resolve();

function enqueuePreferenceSave(userId: string, newLocale: Locale): Promise<"saved" | "skipped"> {
  const run = persistQueue.then(async () => {
    if (useAuthStore.getState().user?.id !== userId) return "skipped" as const;
    // Bound to the account for the whole request, refresh-and-retry included: if the session
    // changes mid-flight the request is aborted rather than completed with the next account's token.
    const controller = new AbortController();
    const unsubscribe = useAuthStore.subscribe((state) => { if (state.user?.id !== userId) controller.abort(); });
    try {
      const updated = await updateMe({ preferred_language: newLocale }, controller.signal);
      const latest = useAuthStore.getState().user;
      if (latest?.id === userId) useAuthStore.getState().setAuthenticated({ ...latest, preferred_language: updated.preferred_language ?? newLocale });
      return "saved" as const;
    } catch (error) {
      if (controller.signal.aborted) return "skipped" as const;
      throw error;
    } finally {
      unsubscribe();
    }
  });
  persistQueue = run.catch(() => undefined);
  return run;
}

/**
 * Change the app language in place: switch the UI immediately, persist the
 * preference on the profile when signed in, revert if that save fails.
 * Shared by Settings and the shell's language switcher.
 */
export function useChangeLanguage() {
  const { locale, setLocale, t } = useLocale();
  const user = useAuthStore((state) => state.user);
  const [isSaving, setIsSaving] = useState(false);

  const changeLanguage = useCallback(async (newLocale: Locale) => {
    if (changeInFlight || newLocale === locale) return;
    const previous = locale;
    trackLanguageSwitched(previous, newLocale);
    changeInFlight = true;
    setIsSaving(true);
    setLocale(newLocale);
    try {
      if (user) await enqueuePreferenceSave(user.id, newLocale);
      toast.success(t("settings.languageUpdated"));
    } catch {
      setLocale(previous);
      toast.error(t("settings.languageUpdateFailed"));
    } finally {
      changeInFlight = false;
      setIsSaving(false);
    }
  }, [locale, setLocale, t, user]);

  /**
   * For a selection that navigates to a localized URL (public pages): the page itself changes
   * the UI language, so only the profile preference is saved — no in-place switch, no rollback
   * (a rollback would fight the new URL). A failure leaves the previous preference.
   */
  const savePreference = useCallback((newLocale: Locale) => {
    const current = useAuthStore.getState().user;
    if (!current) return Promise.resolve();
    return enqueuePreferenceSave(current.id, newLocale).then(() => undefined, () => undefined);
  }, []);

  return { changeLanguage, savePreference, isSaving };
}
