"use client";

import { useEffect } from "react";
import { useLanguageStore } from "@/src/store/languageStore";
import { DEFAULT_LOCALE, isLocale } from "@/src/i18n/types";

/** Keeps <html lang="..."> in sync with the chosen locale. */
export default function LanguageInitializer() {
  const locale = useLanguageStore((state) => state.locale);
  const setLocale = useLanguageStore((state) => state.setLocale);

  useEffect(() => {
    if (isLocale(locale)) {
      document.documentElement.lang = locale;
      return;
    }

    document.documentElement.lang = DEFAULT_LOCALE;
    setLocale(DEFAULT_LOCALE);
  }, [locale, setLocale]);

  return null;
}
