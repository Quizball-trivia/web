import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  Locale,
  getTranslation,
  getCategoryTranslation,
  getQuestionTranslation,
  getCountdownTranslation,
  getClueTranslation,
  translations,
} from '../data/locales';
import { storage, STORAGE_KEYS } from '@/utils/storage';

type TranslationKey = keyof typeof translations.en;
type CategoryTranslation = ReturnType<typeof getCategoryTranslation>;
type QuestionTranslation = ReturnType<typeof getQuestionTranslation>;
type CountdownTranslation = ReturnType<typeof getCountdownTranslation>;
type ClueTranslation = ReturnType<typeof getClueTranslation>;

interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey) => string;
  tCategory: (categoryId: string) => CategoryTranslation;
  tQuestion: (questionId: string) => QuestionTranslation;
  tCountdown: (countdownId: string) => CountdownTranslation;
  tClue: (clueId: string) => ClueTranslation;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    return storage.get(STORAGE_KEYS.LOCALE, 'en') as Locale;
  });

  useEffect(() => {
    storage.set(STORAGE_KEYS.LOCALE, locale);
  }, [locale]);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
  }, []);

  const t = useCallback((key: TranslationKey) => getTranslation(locale, key), [locale]);
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
