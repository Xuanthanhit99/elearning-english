import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeChoice = "LIGHT" | "DARK" | "SYSTEM";

interface ThemeState {
  theme: ThemeChoice;
  setTheme: (theme: ThemeChoice) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: "SYSTEM",
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: "poppylingo-theme",
    },
  ),
);

/** Resolve LIGHT/DARK/SYSTEM against the current OS preference. */
export function resolveIsDark(theme: ThemeChoice): boolean {
  if (theme === "DARK") return true;
  if (theme === "LIGHT") return false;
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}
