import { dictionaries } from "@/src/i18n";
import { useLanguageStore } from "@/src/store/languageStore";

function getPath(source: unknown, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>((acc, key) => {
      if (acc && typeof acc === "object") {
        return (acc as Record<string, unknown>)[key];
      }
      return undefined;
    }, source);
}

export function useTranslation() {
  const locale = useLanguageStore((state) => state.locale);
  const setLocale = useLanguageStore((state) => state.setLocale);
  const dict = dictionaries[locale];

  function t(key: string, vars?: Record<string, string | number>): string {
    const value =
      getPath(dict, key) ?? getPath(dictionaries.vi, key) ?? key;

    if (typeof value !== "string") return key;
    if (!vars) return value;

    return Object.entries(vars).reduce(
      (result, [name, replacement]) =>
        result.replaceAll(`{${name}}`, String(replacement)),
      value,
    );
  }

  return { t, locale, setLocale, dict };
}
