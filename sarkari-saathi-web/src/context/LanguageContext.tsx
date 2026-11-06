"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";
import { translate, type Language, type StringKey } from "@/lib/i18n/strings";
import { loadLanguage, saveLanguage, subscribeToStorage } from "@/lib/storage";

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: StringKey, vars?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // The server (and the hydration pass) always render English; right after
  // hydration React switches to the choice stored in localStorage.
  const language = useSyncExternalStore<Language>(
    subscribeToStorage,
    () => loadLanguage() ?? "en",
    () => "en"
  );

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const t = useCallback<LanguageContextValue["t"]>(
    (key, vars) => {
      const stringVars = vars
        ? Object.fromEntries(Object.entries(vars).map(([k, v]) => [k, String(v)]))
        : undefined;
      return translate(language, key, stringVars);
    },
    [language]
  );

  const value = useMemo(
    () => ({ language, setLanguage: saveLanguage, t }),
    [language, t]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used inside <LanguageProvider>");
  return ctx;
}
