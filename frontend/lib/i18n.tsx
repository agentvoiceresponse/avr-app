'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { enDictionary } from './i18n/en';
import { itDictionary } from './i18n/it';

export type Language = 'it' | 'en';

const LANGUAGE_STORAGE_KEY = 'avr-admin-language';

const dictionaries = {
  en: enDictionary,
  it: itDictionary,
};

export type Dictionary = typeof enDictionary;

interface I18nContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  dictionary: Dictionary;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

function getStoredLanguage(): Language {
  if (typeof window === 'undefined') {
    return 'it';
  }
  const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return stored === 'en' || stored === 'it' ? stored : 'it';
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => getStoredLanguage());

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
      document.documentElement.lang = language;
    }
  }, [language]);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
  }, []);

  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      setLanguage,
      dictionary: dictionaries[language],
    }),
    [language, setLanguage],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within a LanguageProvider');
  }
  return context;
}

export const supportedLanguages: { value: Language; label: string }[] = [
  { value: 'it', label: dictionaries.it.common.languages.it },
  { value: 'en', label: dictionaries.en.common.languages.en },
];
