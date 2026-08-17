"use client";

import { useEffect, useRef } from "react";
import { useLocale } from "@/contexts/LocaleContext";
import { storage, STORAGE_KEYS } from "@/utils/storage";

/**
 * Pins /promo to English on first visit this session so the reused game
 * chrome (counters, submit buttons, result cards) matches the English
 * question content instead of following the geo-inferred locale. A manual
 * EN/KA toggle afterwards is respected.
 *
 * The stored locale is written directly (not just setLocale): this child
 * effect runs BEFORE LocaleContext's hydration effect, which geo-infers a
 * locale only when nothing is stored — persisting first makes the hydration
 * pass keep English instead of clobbering it with the inferred Georgian.
 */
export function PromoLocaleDefault() {
  const { setLocale } = useLocale();
  const applied = useRef(false);

  useEffect(() => {
    if (applied.current) return;
    applied.current = true;
    if (window.sessionStorage.getItem("qb-promo-locale-touched") !== "1") {
      window.sessionStorage.setItem("qb-promo-locale-touched", "1");
      storage.set(STORAGE_KEYS.LOCALE, "en");
      setLocale("en");
    }
  }, [setLocale]);

  return null;
}
