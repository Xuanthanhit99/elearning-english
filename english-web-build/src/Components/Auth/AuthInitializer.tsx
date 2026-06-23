// src/Components/AuthInitializer.tsx
"use client";

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
        const res = await fetch("http://localhost:3002/auth/me", {
          method: "GET",
          credentials: "include",
        });

        if (!res.ok) {
          setUser(null);
          return;
        }

        const user = await res.json();
        setUser(user);
      } catch {
        setUser(null);
      }
    };

    getMe();
  }, [setUser]);

  return null;
}