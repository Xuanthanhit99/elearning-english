"use client";

import { useEffect, useRef, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { ThemeChoice, useThemeStore } from "@/src/store/themeStore";
import { useTranslation } from "@/src/hooks/useTranslation";

const OPTIONS: { value: ThemeChoice; icon: typeof Sun }[] = [
  { value: "LIGHT", icon: Sun },
  { value: "DARK", icon: Moon },
  { value: "SYSTEM", icon: Monitor },
];

export default function ThemeToggle({
  onChange,
}: {
  /** Optional extra callback, e.g. to also persist the choice to /settings. */
  onChange?: (theme: ThemeChoice) => void;
}) {
  const { t } = useTranslation();
  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);
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

  function choose(next: ThemeChoice) {
    setTheme(next);
    onChange?.(next);
    setOpen(false);
  }

  const ActiveIcon = OPTIONS.find((option) => option.value === theme)?.icon ?? Monitor;

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        aria-label={t("header.theme")}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
      >
        <ActiveIcon size={18} />
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-44 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
          {OPTIONS.map(({ value, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => choose(value)}
              className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-bold transition ${
                value === theme
                  ? "bg-violet-50 text-violet-700 dark:bg-violet-950/40"
                  : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              <Icon size={16} />
              <span>{t(`theme.${value.toLowerCase()}`)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
