// Single source of truth for the initial `/auth/me` session check.
// Both AuthInitializer (root layout, every page) and AppShell (main-app
// layout, protected pages) used to call `/auth/me` independently, causing a
// duplicate network request and a race writing the same auth-store keys on
// every protected-route load. Both now call `initializeAuth()`, which
// de-dupes concurrent callers behind a single in-flight promise.
import { api } from "./axios";
import { settingsApi } from "./settings-api";
import { isLocale } from "@/src/i18n/types";
import { useAuthStore } from "@/src/store/authStore";
import { useLanguageStore } from "@/src/store/languageStore";
import { isThemeChoice, useThemeStore } from "@/src/store/themeStore";

function hasLoggedInCookie() {
  if (typeof document === "undefined") return false;
  return document.cookie
    .split("; ")
    .some((item) => item.startsWith("logged_in=true"));
}

function getHttpStatus(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "response" in error &&
    error.response &&
    typeof error.response === "object" &&
    "status" in error.response &&
    typeof error.response.status === "number"
  ) {
    return error.response.status;
  }

  return null;
}

let inFlight: Promise<void> | null = null;

export function initializeAuth(): Promise<void> {
  if (inFlight) return inFlight;

  const { setUser, setStatus } = useAuthStore.getState();

  if (!hasLoggedInCookie()) {
    setUser(null);
    return Promise.resolve();
  }

  inFlight = (async () => {
    try {
      setStatus("loading");
      const res = await api.get("/auth/me");
      setUser(res.data.data.getUser);

      settingsApi
        .get()
        .then((settings) => {
          if (isThemeChoice(settings.theme)) {
            useThemeStore.getState().setTheme(settings.theme);
          }

          const savedLocale = settings.language?.toLowerCase();
          if (isLocale(savedLocale)) {
            useLanguageStore.getState().setLocale(savedLocale);
          }
        })
        .catch(() => undefined);
    } catch (error) {
      const status = getHttpStatus(error);
      if (status && status >= 500) {
        setStatus("error");
      } else {
        setUser(null);
      }
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}
