"use client";

import { useEffect, useRef } from "react";
import { useLocale } from "@/contexts/LocaleContext";

/**
 * Pins /promo to English on first visit this session so the reused game
 * chrome (counters, submit buttons, result cards) matches the English
 * question content instead of following the geo-inferred locale. Mirrors
 * DemoLocaleDefault; a manual EN/KA toggle afterwards is respected.
 */
export function PromoLocaleDefault() {
  const { setLocale } = useLocale();
  const applied = useRef(false);

  useEffect(() => {
    if (applied.current) return;
    applied.current = true;
    if (window.sessionStorage.getItem("qb-promo-locale-touched") !== "1") {
      window.sessionStorage.setItem("qb-promo-locale-touched", "1");
      setLocale("en");
    }
  }, [setLocale]);

  return null;
}
