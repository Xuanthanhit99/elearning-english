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
        className="lumiverse-button-soft h-11 gap-1.5 px-2.5 text-sm"
      >
        <Globe size={17} className="text-[var(--lumiverse-primary)]" />
        <span className="hidden sm:inline">{LOCALE_FLAGS[locale]}</span>
      </button>

      {open && (
        <div className="lumiverse-surface absolute right-0 top-14 z-50 w-44 rounded-3xl p-1.5">
          {LOCALES.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => choose(option)}
              className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-bold transition ${
                option === locale
                  ? "bg-blue-50 text-[var(--lumiverse-primary)] dark:bg-white/10"
                  : "text-[var(--lumiverse-muted)] hover:bg-white/70 dark:hover:bg-white/8"
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
