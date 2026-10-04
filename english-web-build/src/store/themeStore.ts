import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeChoice = "LIGHT" | "DARK" | "SYSTEM";

const THEME_CHOICES: ThemeChoice[] = ["LIGHT", "DARK", "SYSTEM"];

export function isThemeChoice(value: unknown): value is ThemeChoice {
  return typeof value === "string" && THEME_CHOICES.includes(value as ThemeChoice);
}

interface ThemeState {
  theme: ThemeChoice;
  setTheme: (theme: ThemeChoice) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: "LIGHT",
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: "BeaconVie-theme",
    },
  ),
);

/** Resolve LIGHT/DARK/SYSTEM against the current OS preference. */
export function resolveIsDark(theme: ThemeChoice): boolean {
  if (theme === "DARK") return true;
  if (theme === "LIGHT") return false;
  // V4.3 production visual is light-first. SYSTEM remains light until the dark
  // theme receives its own visual-fidelity gate.
  return false;
}
