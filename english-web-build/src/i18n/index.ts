import vi from "./locales/vi";
import { Dictionary, Locale } from "./types";

export const dictionaries: Record<Locale, Dictionary> = {
  vi,
  en: vi,
  zh: vi,
  de: vi,
};

export * from "./types";
