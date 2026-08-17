"use client";

import { useEffect, useRef } from "react";
import { useLocale } from "@/contexts/LocaleContext";
import { isSupportedLocale } from "@/lib/i18n/messages";
import { storage, STORAGE_KEYS } from "@/utils/storage";

/**
 * Pins /promo to English so the reused game chrome (counters, submit
 * buttons, result cards) matches the English question content — but ONLY
 * when no explicit locale is in effect: a stored EN/KA choice and a
 * path-derived locale retained from client-side navigation (e.g. /ka →
 * /promo) are both respected.
 *
 * The stored locale is written directly (not just setLocale): this child
 * effect commits before LocaleContext's hydration effect in practice, and
 * that hydration pass geo-infers a locale only when nothing valid is
 * stored — persisting first makes it keep English instead of applying the
 * inferred Georgian. Validation mirrors readStoredLocale: an unsupported
 * stored value (e.g. "" or "fr") counts as no preference, matching what
 * hydration would do with it.
 */
export function PromoLocaleDefault() {
  const { locale, setLocale } = useLocale();
  const applied = useRef(false);

  useEffect(() => {
    if (applied.current) return;
    applied.current = true;
    try {
      if (window.sessionStorage.getItem("qb-promo-locale-touched") === "1") return;
      window.sessionStorage.setItem("qb-promo-locale-touched", "1");
    } catch {
      // Storage-restricted context (e.g. private mode): fall through and
      // still attempt the pin, just without the session dedupe.
    }
    // A non-default locale here means it was set by an explicit source
    // (path locale retained across navigation, or an earlier hydration) —
    // leave it alone.
    if (locale !== "en") return;
    const stored = storage.get<string | null>(STORAGE_KEYS.LOCALE, null);
    if (!isSupportedLocale(stored ?? "")) {
      storage.set(STORAGE_KEYS.LOCALE, "en");
      setLocale("en");
    }
  }, [locale, setLocale]);

  return null;
}
