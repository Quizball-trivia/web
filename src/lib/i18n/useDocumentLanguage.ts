import { useEffect } from "react";
import type { Locale } from "./locale-config";

/**
 * The server writes <html lang> from the address of the first page only. Client navigation keeps that element, and
 * an address without a language prefix is rendered as English before the player's own language is known.
 */
export function useDocumentLanguage(language: Locale): void {
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);
}
