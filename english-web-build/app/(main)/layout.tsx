"use client";

import AuthInitializer from "@/src/Components/Auth/AuthInitializer";
import Header from "@/src/Components/HomePage/Header";
import WelcomeLoginModal from "@/src/Components/WelcomeLoginModal";
import { api } from "@/src/lib/axios";
import { useAuthStore } from "@/src/store/authStore";
import axios from "axios";
import { useEffect, useState } from "react";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    const getMe = async () => {
      try {
        const res = await api.get("/auth/me");

        setUser(res.data.data.getUser);

        const hasShown = sessionStorage.getItem("welcome_shown");

        if (!hasShown) {
          setShowWelcome(true);
          sessionStorage.setItem("welcome_shown", "true");
        }
      } catch (error) {
        console.error(error);
        setUser(null);
      }
    };

    getMe();
  }, [setUser]);

  return (
    <>
      <AuthInitializer />
      
      <Header />
       <WelcomeLoginModal
        open={showWelcome}
        fullname={user?.fullname}
        avatar="/cat-home.jpg"
        onClose={() => setShowWelcome(false)}
      />

      {children}
    </>
  );
}