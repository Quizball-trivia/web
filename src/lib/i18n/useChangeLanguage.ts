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
export function useChangeLanguage() {
  const { locale, setLocale, t } = useLocale();
  const { user, setAuthenticated } = useAuthStore();
  const [isSaving, setIsSaving] = useState(false);

  const changeLanguage = useCallback(async (newLocale: Locale) => {
    if (isSaving || newLocale === locale) return;
    trackLanguageSwitched(locale, newLocale);
    setLocale(newLocale);
    setIsSaving(true);
    try {
      if (user) {
        const updated = await updateMe({ preferred_language: newLocale });
        setAuthenticated({ ...user, preferred_language: updated.preferred_language ?? newLocale });
      }
      toast.success(t("settings.languageUpdated"));
    } catch {
      setLocale(locale);
      toast.error(t("settings.languageUpdateFailed"));
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, locale, setLocale, t, user, setAuthenticated]);

  return { changeLanguage, isSaving };
}
