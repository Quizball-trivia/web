'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { usePathname } from 'next/navigation';
import {
  getCategoryTranslation,
  getQuestionTranslation,
  getCountdownTranslation,
  getClueTranslation,
} from '../data/locales';
import { useAuthStore } from '@/stores/auth.store';
import { type Locale, type MessageKey, isSupportedLocale, normalizeLocale, translate } from '@/lib/i18n/messages';
import { storage, STORAGE_KEYS } from '@/utils/storage';

type CategoryTranslation = ReturnType<typeof getCategoryTranslation>;
type QuestionTranslation = ReturnType<typeof getQuestionTranslation>;
type CountdownTranslation = ReturnType<typeof getCountdownTranslation>;
type ClueTranslation = ReturnType<typeof getClueTranslation>;

interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey, params?: Record<string, string | number>) => string;
  tCategory: (categoryId: string) => CategoryTranslation;
  tQuestion: (questionId: string) => QuestionTranslation;
  tCountdown: (countdownId: string) => CountdownTranslation;
  tClue: (clueId: string) => ClueTranslation;
}

/**
 * Default context — used when components are rendered outside the
 * `<LocaleProvider>` (most commonly tests). Resolves keys via the static
 * `translate('en', ...)` so components render real English copy without
 * forcing every test fixture to mount a provider.
 */
const DEFAULT_LOCALE_CONTEXT: LocaleContextType = {
  locale: 'en',
  setLocale: () => {},
  t: (key, params) => translate('en', key, params),
  tCategory: (categoryId) => getCategoryTranslation('en', categoryId),
  tQuestion: (questionId) => getQuestionTranslation('en', questionId),
  tCountdown: (countdownId) => getCountdownTranslation('en', countdownId),
  tClue: (clueId) => getClueTranslation('en', clueId),
};

const LocaleContext = createContext<LocaleContextType>(DEFAULT_LOCALE_CONTEXT);

interface LocaleProviderProps {
  children: React.ReactNode;
  // Server-supplied locale from URL (e.g. /ka/about → "ka"). When provided,
  // it takes precedence over localStorage so SEO pages render in the URL's
  // language on the FIRST paint, not after client hydration.
  initialLocale?: Locale;
}

// Extract the locale prefix from a URL path. Returns null when the path has
// no recognized locale segment (e.g. /play, /auth, /settings).
function localeFromPath(pathname: string | null): Locale | null {
  if (!pathname) return null;
  const first = pathname.replace(/^\/+/, '').split('/')[0];
  return isSupportedLocale(first) ? first : null;
}

export function LocaleProvider({ children, initialLocale }: LocaleProviderProps) {
  const preferredLanguage = useAuthStore((state) => state.user?.preferred_language);
  const lastSyncedPreferredLanguage = useRef<string | null | undefined>(undefined);
  // usePathname updates on every client-side navigation, so we can derive the
  // active SEO locale from the URL in real time. initialLocale only seeds the
  // very first render — after that the pathname is the source of truth.
  const pathname = usePathname();
  const pathLocale = localeFromPath(pathname);
  const [locale, setLocaleState] = useState<Locale>(initialLocale ?? pathLocale ?? 'en');
  const hasHydratedRef = useRef(false);

  // Re-sync when the URL locale changes (clicking the EN/KA switcher).
  // Functional updater lets us drop `locale` from the deps — React only
  // schedules the update when the value actually differs. queueMicrotask
  // defers the dispatch off the effect tick (same pattern as the hydration
  // effect below) to satisfy the cascading-renders lint rule.
  useEffect(() => {
    if (!pathLocale) return;
    queueMicrotask(() => {
      setLocaleState((prev) => (prev !== pathLocale ? pathLocale : prev));
    });
  }, [pathLocale]);

  useEffect(() => {
    if (hasHydratedRef.current) return;
    hasHydratedRef.current = true;
    // If the route already supplied a locale (localized SEO pages), trust it
    // and skip the localStorage upgrade — the URL is the source of truth.
    if (initialLocale || pathLocale) return;
    const stored = normalizeLocale(storage.get(STORAGE_KEYS.LOCALE, 'en'));
    if (stored !== 'en') {
      queueMicrotask(() => setLocaleState(stored));
    }
  }, [initialLocale, pathLocale]);

  useEffect(() => {
    if (!hasHydratedRef.current) return;
    storage.set(STORAGE_KEYS.LOCALE, locale);
  }, [locale]);

  useEffect(() => {
    if (
      preferredLanguage !== lastSyncedPreferredLanguage.current &&
      isSupportedLocale(preferredLanguage) &&
      preferredLanguage !== locale
    ) {
      queueMicrotask(() => {
        setLocaleState(preferredLanguage);
      });
    }
    lastSyncedPreferredLanguage.current = preferredLanguage;
  }, [locale, preferredLanguage]);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
  }, []);

  const t = useCallback((key: MessageKey, params?: Record<string, string | number>) => translate(locale, key, params), [locale]);
  const tCategory = useCallback((categoryId: string) => getCategoryTranslation(locale, categoryId), [locale]);
  const tQuestion = useCallback((questionId: string) => getQuestionTranslation(locale, questionId), [locale]);
  const tCountdown = useCallback((countdownId: string) => getCountdownTranslation(locale, countdownId), [locale]);
  const tClue = useCallback((clueId: string) => getClueTranslation(locale, clueId), [locale]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo<LocaleContextType>(() => ({
    locale,
    setLocale,
    t,
    tCategory,
    tQuestion,
    tCountdown,
    tClue,
  }), [locale, setLocale, t, tCategory, tQuestion, tCountdown, tClue]);

  return (
    <LocaleContext.Provider value={contextValue}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}
