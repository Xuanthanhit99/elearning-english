import { DEFAULT_LOCALE, Locale } from "@/src/i18n/types";

const INTL_LOCALES: Record<Locale, string> = {
  vi: "vi-VN",
  en: "en-US",
  zh: "zh-CN",
  de: "de-DE",
};

export function toIntlLocale(locale: string | Locale | null | undefined) {
  return INTL_LOCALES[(locale as Locale) ?? DEFAULT_LOCALE] ?? INTL_LOCALES[DEFAULT_LOCALE];
}

export function formatDate(
  value: string | number | Date,
  locale: string | Locale,
  options?: Intl.DateTimeFormatOptions,
) {
  return new Intl.DateTimeFormat(toIntlLocale(locale), {
    year: "numeric",
    month: "short",
    day: "2-digit",
    ...options,
  }).format(new Date(value));
}

export function formatTime(
  value: string | number | Date,
  locale: string | Locale,
  options?: Intl.DateTimeFormatOptions,
) {
  return new Intl.DateTimeFormat(toIntlLocale(locale), {
    hour: "2-digit",
    minute: "2-digit",
    ...options,
  }).format(new Date(value));
}

export function formatDateTime(
  value: string | number | Date,
  locale: string | Locale,
  options?: Intl.DateTimeFormatOptions,
) {
  return new Intl.DateTimeFormat(toIntlLocale(locale), {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    ...options,
  }).format(new Date(value));
}

export function formatNumber(
  value: number,
  locale: string | Locale,
  options?: Intl.NumberFormatOptions,
) {
  return new Intl.NumberFormat(toIntlLocale(locale), options).format(value);
}

export function formatPercent(value: number, locale: string | Locale) {
  return new Intl.NumberFormat(toIntlLocale(locale), {
    maximumFractionDigits: 0,
    style: "percent",
  }).format(value);
}

export function formatRelativeTime(
  value: number,
  unit: Intl.RelativeTimeFormatUnit,
  locale: string | Locale,
  options?: Intl.RelativeTimeFormatOptions,
) {
  return new Intl.RelativeTimeFormat(toIntlLocale(locale), {
    numeric: "auto",
    ...options,
  }).format(value, unit);
}

export function formatDuration(minutes: number, locale: string | Locale) {
  return new Intl.NumberFormat(toIntlLocale(locale), {
    maximumFractionDigits: 0,
  }).format(minutes);
}
