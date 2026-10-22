"use client";

import { useEffect, useState } from "react";

type AltMap = Record<string, string>;
const loaded = new Map<string, AltMap>();
const pending = new Map<string, Promise<AltMap | null>>();
const LOCALES = ["en", "es", "pt", "tr", "ru", "ka"];

/** One load per language at a time; a failed one is not kept, so the next board asks again. */
function load(lang: string): Promise<AltMap | null> {
  let p = pending.get(lang);
  if (!p) {
    p = fetch(`/assets/codenames/alt/${lang}.json`)
      .then((r) => (r.ok ? (r.json() as Promise<AltMap>) : null))
      .catch(() => null)
      .then((m) => { pending.delete(lang); if (m) loaded.set(lang, m); return m; });
    pending.set(lang, p);
  }
  return p;
}

/** What each picture shows, in the reader's language, for screen readers (loaded once per language, after the board). */
export function useCardAlt(locale: string): (id: string) => string | undefined {
  const lang = LOCALES.includes(locale) ? locale : "en";
  const [, setLoads] = useState(0);
  useEffect(() => {
    if (loaded.has(lang)) return;
    let live = true;
    void load(lang).then((m) => { if (live && m) setLoads((n) => n + 1); });
    return () => { live = false; };
  }, [lang]);
  const map = loaded.get(lang);
  return (id) => map?.[id];
}
