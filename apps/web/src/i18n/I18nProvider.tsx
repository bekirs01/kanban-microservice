import { enUS, ru as ruLocale, tr as trLocale } from "date-fns/locale";
import type { Locale } from "date-fns";
import React, {
  createContext,
  useCallback,
  useMemo,
  useState,
} from "react";
import { dictionaries } from "./dictionaries";
import { interpolate } from "./interpolate";
import {
  LANGUAGE_STORAGE_KEY,
  type LocaleCode,
  type TranslateFn,
} from "./types";

export type { LocaleCode, TranslateFn };

type I18nContextValue = {
  locale: LocaleCode;
  setLanguage: (next: LocaleCode) => void;
  t: TranslateFn;
  dateFnsLocale: Locale;
};

export const I18nContext = createContext<I18nContextValue | null>(null);

function readStoredLocale(): LocaleCode {
  if (typeof window === "undefined") return "en";
  const raw = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (raw === "en" || raw === "ru" || raw === "tr") return raw;
  return "en";
}

const dateLocales: Record<LocaleCode, Locale> = {
  en: enUS,
  ru: ruLocale,
  tr: trLocale,
};

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleCode>(() =>
    typeof window !== "undefined" ? readStoredLocale() : "en",
  );

  const setLanguage = useCallback((next: LocaleCode) => {
    setLocaleState(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
    }
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const primary = dictionaries[locale][key];
      if (primary !== undefined)
        return vars ? interpolate(primary, vars) : primary;
      const fallback = dictionaries.en[key];
      if (fallback !== undefined)
        return vars ? interpolate(fallback, vars) : fallback;
      return key;
    },
    [locale],
  );

  const value = useMemo(
    (): I18nContextValue => ({
      locale,
      setLanguage,
      t,
      dateFnsLocale: dateLocales[locale],
    }),
    [locale, setLanguage, t],
  );

  return (
    <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
  );
}
