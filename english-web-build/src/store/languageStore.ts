import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_LOCALE, Locale } from "@/src/i18n/types";

interface LanguageState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      locale: DEFAULT_LOCALE,
      setLocale: (locale) => set({ locale }),
    }),
    {
      name: "poppylingo-locale",
    },
  ),
);
