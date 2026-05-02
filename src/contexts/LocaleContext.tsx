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

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const preferredLanguage = useAuthStore((state) => state.user?.preferred_language);
  const lastSyncedPreferredLanguage = useRef<string | null | undefined>(undefined);
  const [locale, setLocaleState] = useState<Locale>(() => {
    return normalizeLocale(storage.get(STORAGE_KEYS.LOCALE, 'en'));
  });

  useEffect(() => {
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
  const context = useContext(LocaleContext);
  if (context === undefined) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
}
