"use client";

import { useEffect, useRef } from "react";
import { useLocale } from "@/contexts/LocaleContext";

/**
 * Defaults the whole /demos tree to Georgian on first visit this session.
 * Once the visitor uses the EN/KA toggle (which sets the flag) their choice
 * is respected and never overridden again.
 */
export function DemoLocaleDefault() {
  const { setLocale } = useLocale();
  const applied = useRef(false);

  useEffect(() => {
    if (applied.current) return;
    applied.current = true;
    if (window.sessionStorage.getItem("qb-demo-locale-touched") !== "1") {
      window.sessionStorage.setItem("qb-demo-locale-touched", "1");
      setLocale("ka");
    }
  }, [setLocale]);

  return null;
}
