// src/Components/AuthInitializer.tsx
"use client";

import { api } from "@/src/lib/axios";
import { settingsApi } from "@/src/lib/settings-api";
import { isLocale } from "@/src/i18n/types";
import { useAuthStore } from "@/src/store/authStore";
import { useLanguageStore } from "@/src/store/languageStore";
import { isThemeChoice, useThemeStore } from "@/src/store/themeStore";
import { useEffect } from "react";

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

function hasLoggedInCookie() {
  return document.cookie
    .split("; ")
    .some((item) => item.startsWith("logged_in=true"));
}

export default function AuthInitializer() {
  const setUser = useAuthStore((s) => s.setUser);
  const setStatus = useAuthStore((s) => s.setStatus);
  const setLocale = useLanguageStore((s) => s.setLocale);
  const setTheme = useThemeStore((s) => s.setTheme);

  useEffect(() => {
    if (!hasLoggedInCookie()) {
      setUser(null);
      return;
    }

    const getMe = async () => {
      try {
        setStatus("loading");
        const res = await api.get("/auth/me");

        setUser(res.data.data.getUser);
        sessionStorage.setItem("welcome_shown", "true");

        settingsApi
          .get()
          .then((settings) => {
            if (isThemeChoice(settings.theme)) {
              setTheme(settings.theme);
            }

            const savedLocale = settings.language?.toLowerCase();
            if (isLocale(savedLocale)) {
              setLocale(savedLocale);
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
      }
    };

    getMe();
  }, [setLocale, setStatus, setTheme, setUser]);

  return null;
}
