"use client";

import { useEffect } from "react";
import { resolveIsDark, useThemeStore } from "@/src/store/themeStore";

/**
 * Applies the chosen theme (LIGHT/DARK/SYSTEM) to <html class="dark">.
 * Mount once near the root layout. Persistence + the anti-flash inline
 * script live alongside this so the very first paint already matches
 * the user's saved preference.
 */
export default function ThemeInitializer() {
  const theme = useThemeStore((state) => state.theme);

  useEffect(() => {
    const apply = () => {
      const isDark = resolveIsDark(theme);
      document.documentElement.classList.toggle("dark", isDark);
    };

    apply();

    if (theme !== "SYSTEM") return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme]);

  return null;
}

/** Inline script string injected before hydration to avoid a flash of
 * the wrong theme. Reads the same localStorage key zustand persist uses. */
export const themeAntiFlashScript = `
(function () {
  try {
    var raw = localStorage.getItem('poppylingo-theme');
    var theme = raw ? (JSON.parse(raw).state || {}).theme : 'SYSTEM';
    var isDark = theme === 'DARK' ||
      ((!theme || theme === 'SYSTEM') &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;
