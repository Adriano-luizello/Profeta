"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { translations, Locale } from "./i18n";

type Translation = (typeof translations)[Locale];

const LocaleContext = createContext<{
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: Translation;
}>({
  locale: "pt",
  setLocale: () => {},
  t: translations.pt,
});

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>("pt");
  return (
    <LocaleContext.Provider
      value={{ locale, setLocale, t: translations[locale] }}
    >
      {children}
    </LocaleContext.Provider>
  );
}

export const useLocale = () => useContext(LocaleContext);
