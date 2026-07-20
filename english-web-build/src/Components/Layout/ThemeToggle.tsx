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
        className="lumiverse-button-soft h-11 w-11 p-0 text-[var(--lumiverse-muted)]"
      >
        <ActiveIcon size={18} />
      </button>

      {open && (
        <div className="lumiverse-surface absolute right-0 top-14 z-50 w-44 rounded-3xl p-1.5">
          {OPTIONS.map(({ value, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => choose(value)}
              className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-bold transition ${
                value === theme
                  ? "bg-blue-50 text-[var(--lumiverse-primary)] dark:bg-white/10"
                  : "text-[var(--lumiverse-muted)] hover:bg-white/70 dark:hover:bg-white/8"
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
