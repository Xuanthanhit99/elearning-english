"use client";

import Header from "@/src/Components/HomePage/Header";
import FloatingPetCompanion from "@/src/Components/Pets/FloatingPetCompanion";
import PetSelectionPrompt from "@/src/Components/Pets/PetSelectionPrompt";
import WelcomeLoginModal from "@/src/Components/WelcomeLoginModal";
import { api } from "@/src/lib/axios";
import { useAuthStore } from "@/src/store/authStore";
import { useEffect, useState } from "react";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showPetPrompt, setShowPetPrompt] = useState(false);
  const [petDaysLeft, setPetDaysLeft] = useState(7);

  useEffect(() => {
    const getMe = async () => {
      try {
        const res = await api.get("/auth/me");
        const currentUser = res.data.data.getUser;
        setUser(currentUser);

        const petRes = await api.get("/pets/me");
        if (petRes.data?.mustChoosePet) {
          sessionStorage.removeItem("welcome_shown");
          setPetDaysLeft(petRes.data.daysLeftToChoose ?? 7);
          setShowWelcome(false);
          setShowPetPrompt(true);
          return;
        }

        setShowPetPrompt(false);
        const hasShownWelcome = sessionStorage.getItem("welcome_shown");
        if (!hasShownWelcome) {
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
      <Header />
      <WelcomeLoginModal
        open={showWelcome && !showPetPrompt}
        fullname={user?.fullname}
        avatar="/cat-home.jpg"
        onClose={() => setShowWelcome(false)}
      />
      <PetSelectionPrompt
        open={showPetPrompt}
        fullname={user?.fullname}
        daysLeft={petDaysLeft}
        onClose={() => setShowPetPrompt(false)}
      />

      {children}
      <FloatingPetCompanion />
    </>
  );
}
