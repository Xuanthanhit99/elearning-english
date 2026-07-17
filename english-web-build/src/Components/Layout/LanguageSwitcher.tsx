"use client";

import { useEffect, useRef, useState } from "react";
import { Globe } from "lucide-react";
import { LOCALES, LOCALE_FLAGS, LOCALE_LABELS, Locale } from "@/src/i18n/types";
import { useLanguageStore } from "@/src/store/languageStore";

export default function LanguageSwitcher({
  onChange,
}: {
  /** Optional extra callback, e.g. to also persist the choice to /settings. */
  onChange?: (locale: Locale) => void;
}) {
  const locale = useLanguageStore((state) => state.locale);
  const setLocale = useLanguageStore((state) => state.setLocale);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function choose(next: Locale) {
    setLocale(next);
    onChange?.(next);
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        aria-label={LOCALE_LABELS[locale]}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 text-sm font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
      >
        <Globe size={17} className="text-violet-600" />
        <span className="hidden sm:inline">{LOCALE_FLAGS[locale]}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-44 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
          {LOCALES.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => choose(option)}
              className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-bold transition ${
                option === locale
                  ? "bg-violet-50 text-violet-700 dark:bg-violet-950/40"
                  : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              <span>{LOCALE_FLAGS[option]}</span>
              <span>{LOCALE_LABELS[option]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
