import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_LOCALE, isLocale, Locale } from "@/src/i18n/types";

const LOCALE_COOKIE = "lumiverse-locale";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

function readCookieLocale(): Locale {
  if (typeof document === "undefined") return DEFAULT_LOCALE;

  const match = document.cookie
    .split("; ")
    .find((item) => item.startsWith(`${LOCALE_COOKIE}=`));
  const value = match ? decodeURIComponent(match.split("=")[1] ?? "") : "";

  return isLocale(value) ? value : DEFAULT_LOCALE;
}

function writeCookieLocale(locale: Locale) {
  if (typeof document === "undefined") return;

  document.cookie = `${LOCALE_COOKIE}=${encodeURIComponent(
    locale,
  )}; Max-Age=${ONE_YEAR_SECONDS}; Path=/; SameSite=Lax`;
}

interface LanguageState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      locale: readCookieLocale(),
      setLocale: (locale) => {
        writeCookieLocale(locale);
        set({ locale });
      },
    }),
    {
      name: "poppylingo-locale",
      onRehydrateStorage: () => (state) => {
        if (state?.locale) writeCookieLocale(state.locale);
      },
    },
  ),
);
