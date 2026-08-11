import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { Language, StringKey, translate } from "../i18n/strings";
import { getStoredLanguage, setStoredLanguage } from "../storage/language";

interface LanguageContextValue {
  language: Language;
  initializing: boolean;
  setLanguage: (language: Language) => Promise<void>;
  t: (key: StringKey, vars?: Record<string, string>) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  language: "en",
  initializing: true,
  setLanguage: async () => {},
  t: (key) => translate("en", key),
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    getStoredLanguage().then((stored) => {
      if (stored) setLanguageState(stored);
      setInitializing(false);
    });
  }, []);

  async function setLanguage(newLanguage: Language) {
    await setStoredLanguage(newLanguage);
    setLanguageState(newLanguage);
  }

  function t(key: StringKey, vars?: Record<string, string>) {
    return translate(language, key, vars);
  }

  return (
    <LanguageContext.Provider value={{ language, initializing, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
