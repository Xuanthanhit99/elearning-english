import vi from "./locales/vi";
import en from "./locales/en";
import zh from "./locales/zh";
import de from "./locales/de";
import { Dictionary, Locale } from "./types";

export const dictionaries: Record<Locale, Dictionary> = { vi, en, zh, de };

export * from "./types";
