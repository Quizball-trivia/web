'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
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

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const preferredLanguage = useAuthStore((state) => state.user?.preferred_language);
  const lastSyncedPreferredLanguage = useRef<string | null | undefined>(undefined);
  // First render must match the SSR pass — localStorage isn't available on the
  // server, so the server emits English. We hydrate to the stored locale in an
  // effect after mount to avoid a hydration mismatch on the first paint.
  const [locale, setLocaleState] = useState<Locale>('en');
  const hasHydratedRef = useRef(false);

  useEffect(() => {
    if (hasHydratedRef.current) return;
    hasHydratedRef.current = true;
    const stored = normalizeLocale(storage.get(STORAGE_KEYS.LOCALE, 'en'));
    if (stored !== 'en') {
      // Intentional sync hydration from localStorage — SSR emits 'en',
      // then we upgrade on mount. Defer to microtask so React doesn't
      // flag it as a cascading render.
      queueMicrotask(() => setLocaleState(stored));
    }
  }, []);

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
