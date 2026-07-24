// src/Components/AuthInitializer.tsx
"use client";

import { initializeAuth } from "@/src/lib/auth-init";
import { useEffect } from "react";

export default function AuthInitializer() {
  useEffect(() => {
    void initializeAuth();
  }, []);

  return null;
}
