"use client";

import Header from "@/src/Components/HomePage/Header";
import FloatingPetCompanion from "@/src/Components/Pets/FloatingPetCompanion";
import PetSelectionPrompt from "@/src/Components/Pets/PetSelectionPrompt";
import MobileStudyNav from "@/src/Components/Layout/MobileStudyNav";
import StudySidebar from "@/src/Components/Layout/StudySidebar";
import WelcomeLoginModal from "@/src/Components/WelcomeLoginModal";
import { api } from "@/src/lib/axios";
import { useAuthStore } from "@/src/store/authStore";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const pathname = usePathname();
  const usesCustomDashboardShell =
    pathname === "/" ||
    pathname.startsWith("/courses") ||
    pathname.startsWith("/flashcards") ||
    pathname.startsWith("/grammar") ||
    pathname.startsWith("/reading") ||
    pathname.startsWith("/speaking") ||
    pathname.startsWith("/writing") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/pet") ||
    pathname.startsWith("/missions") ||
    pathname.startsWith("/community") ||
    pathname.startsWith("/vocabulary") ||
    pathname.startsWith("/listening") ||
    pathname.startsWith("/dictionary") ||
    pathname.startsWith("/pronunciation") ||
    pathname.startsWith("/placement-test") ||
    pathname.startsWith("/check") ||
    pathname.startsWith("/check-word");
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
      {!usesCustomDashboardShell && <Header />}
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

      {usesCustomDashboardShell ? (
        <div className="single-menu-shell min-h-screen bg-[#fbfbff]">
          <StudySidebar fixed />
          <MobileStudyNav />
          <div className="single-menu-content min-h-screen xl:pl-[286px]">
            {children}
          </div>
          <style jsx global>{`
            .single-menu-content > main,
            .single-menu-content main[class*="ml-"],
            .single-menu-content main[class*="ml-\\["] {
              margin-left: 0 !important;
            }

            .single-menu-content > div > .flex > aside[class*="fixed"][class*="left-0"][class*="h-screen"],
            .single-menu-content > div > .flex > aside[class*="sticky"][class*="h-screen"],
            .single-menu-content main > div > aside[class*="sticky"][class*="h-screen"],
            .single-menu-content main > div > aside[class*="fixed"][class*="left-0"][class*="h-screen"],
            .single-menu-content section > div > aside[class*="sticky"][class*="h-screen"],
            .single-menu-content section > div > aside[class*="fixed"][class*="left-0"][class*="h-screen"] {
              display: none !important;
            }

            .single-menu-content > div > .flex > main[class*="ml-"],
            .single-menu-content main > div > section,
            .single-menu-content section > div > section {
              margin-left: 0 !important;
            }
          `}</style>
        </div>
      ) : (
        children
      )}
      {!usesCustomDashboardShell && <FloatingPetCompanion />}
    </>
  );
}
