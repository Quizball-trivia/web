"use client";

import { useEffect, useRef } from "react";
import { useLocale } from "@/contexts/LocaleContext";
import { storage, STORAGE_KEYS } from "@/utils/storage";

/**
 * Pins /promo to Georgian: the quiz content is Georgian editorial text, so
 * the reused game chrome (counters, submit buttons, result cards) must match.
 *
 * Unlike a normal route this pin is UNCONDITIONAL (session-once) — /promo is
 * a staging-only film prop for the promo shoot, and a mixed-language frame on
 * camera is worse than overriding a tester's stored preference. The stored
 * locale is written before LocaleContext's hydration effect reads it, so the
 * geo-/storage-derived locale can't clobber the pin; hydration never
 * dispatches 'en' over live state, so the setLocale('ka') sticks in every
 * storage state (empty, invalid, 'en', or already 'ka').
 */
export function PromoLocaleDefault({ locale = "ka" }: { locale?: "ka" | "en" }) {
  const { setLocale } = useLocale();
  const applied = useRef(false);

  useEffect(() => {
    if (applied.current) return;
    applied.current = true;
    try {
      const touchKey = `qb-promo-locale-touched:${locale}`;
      if (window.sessionStorage.getItem(touchKey) === "1") return;
      window.sessionStorage.setItem(touchKey, "1");
    } catch {
      // Storage-restricted context (e.g. private mode): fall through and
      // still attempt the pin, just without the session dedupe.
    }
    storage.set(STORAGE_KEYS.LOCALE, locale);
    setLocale(locale);
  }, [setLocale, locale]);

  return null;
}
