// src/Components/AuthInitializer.tsx
"use client";

import { api } from "@/src/lib/axios";
import { useAuthStore } from "@/src/store/authStore";
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
  }, [setStatus, setUser]);

  return null;
}
