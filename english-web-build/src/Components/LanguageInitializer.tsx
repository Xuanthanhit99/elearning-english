"use client";

import { useEffect } from "react";
import { useLanguageStore } from "@/src/store/languageStore";

/** Keeps <html lang="..."> in sync with the chosen locale. */
export default function LanguageInitializer() {
  const locale = useLanguageStore((state) => state.locale);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return null;
}
