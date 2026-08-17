"use client";

import { useEffect, useRef } from "react";
import { useLocale } from "@/contexts/LocaleContext";
import { storage, STORAGE_KEYS } from "@/utils/storage";

/**
 * Pins /promo to English so the reused game chrome (counters, submit
 * buttons, result cards) matches the English question content — but ONLY
 * when the visitor has no explicitly stored locale. An explicit EN/KA
 * choice (made via the switcher on any route) is never overridden.
 *
 * The stored locale is written directly (not just setLocale): this child
 * effect commits before LocaleContext's hydration effect in practice, and
 * that hydration pass geo-infers a locale only when nothing is stored —
 * persisting first makes it keep English instead of applying the inferred
 * Georgian. Writing only when storage is empty means we replace the
 * inference default, never a user preference.
 */
export function PromoLocaleDefault() {
  const { setLocale } = useLocale();
  const applied = useRef(false);

  useEffect(() => {
    if (applied.current) return;
    applied.current = true;
    if (window.sessionStorage.getItem("qb-promo-locale-touched") === "1") return;
    window.sessionStorage.setItem("qb-promo-locale-touched", "1");
    const stored = storage.get<string | null>(STORAGE_KEYS.LOCALE, null);
    if (stored === null) {
      storage.set(STORAGE_KEYS.LOCALE, "en");
      setLocale("en");
    }
  }, [setLocale]);

  return null;
}
