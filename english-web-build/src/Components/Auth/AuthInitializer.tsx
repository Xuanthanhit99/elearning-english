// src/Components/AuthInitializer.tsx
"use client";

import { api } from "@/src/lib/axios";
import { useAuthStore } from "@/src/store/authStore";
import { useEffect } from "react";

function hasLoggedInCookie() {
  return document.cookie
    .split("; ")
    .some((item) => item.startsWith("logged_in=true"));
}

export default function AuthInitializer() {
  const setUser = useAuthStore((s) => s.setUser);

  useEffect(() => {
    if (!hasLoggedInCookie()) {
      setUser(null);
      return;
    }

    const getMe = async () => {
      try {
        const res = await api.get("/auth/me");

        setUser(res.data.data.getUser);
        sessionStorage.setItem("welcome_shown", "true");
      } catch {
        setUser(null);
      }
    };

    getMe();
  }, [setUser]);

  return null;
}
