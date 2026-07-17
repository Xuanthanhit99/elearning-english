"use client";

import FloatingPetCompanion from "@/src/Components/Pets/FloatingPetCompanion";
import PetSelectionPrompt from "@/src/Components/Pets/PetSelectionPrompt";
import WelcomeLoginModal from "@/src/Components/WelcomeLoginModal";
import { api } from "@/src/lib/axios";
import { useAuthStore } from "@/src/store/authStore";
import { ReactNode, useEffect, useState } from "react";
import ResponsiveContainer from "../UI/ResponsiveContainer";
import AppHeader from "./AppHeader";
import AppSidebar from "./AppSidebar";

export default function AppShell({ children }: { children: ReactNode }) {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("sidebar-collapsed") === "true";
  });
  const [mobileOpen, setMobileOpen] = useState(false);
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

  function handleSidebarCollapsed(value: boolean) {
    setSidebarCollapsed(value);
    localStorage.setItem("sidebar-collapsed", String(value));
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AppSidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileOpen}
        onCollapsedChange={handleSidebarCollapsed}
        onMobileOpenChange={setMobileOpen}
      />

      <AppHeader
        sidebarCollapsed={sidebarCollapsed}
        onOpenMobileMenu={() => setMobileOpen(true)}
      />

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
<FloatingPetCompanion />

      <main
        className={[
          "app-shell-content single-menu-content min-h-screen pt-16 transition-[padding-left] duration-300",
          sidebarCollapsed ? "lg:pl-[84px]" : "lg:pl-[264px]",
        ].join(" ")}
      >
        <ResponsiveContainer>{children}</ResponsiveContainer>
      </main>

      <style jsx global>{`
        .app-shell-content > main,
        .app-shell-content main[class*="ml-"],
        .app-shell-content main[class*="ml-\\["] {
          margin-left: 0 !important;
        }

        .app-shell-content > div > .flex > aside[class*="fixed"][class*="left-0"][class*="h-screen"],
        .app-shell-content > div > .flex > aside[class*="sticky"][class*="h-screen"],
        .app-shell-content main > div > aside[class*="sticky"][class*="h-screen"],
        .app-shell-content main > div > aside[class*="fixed"][class*="left-0"][class*="h-screen"],
        .app-shell-content section > div > aside[class*="sticky"][class*="h-screen"],
        .app-shell-content section > div > aside[class*="fixed"][class*="left-0"][class*="h-screen"] {
          display: none !important;
        }

        .app-shell-content > div > .flex > main[class*="ml-"],
        .app-shell-content main > div > section,
        .app-shell-content section > div > section {
          margin-left: 0 !important;
        }
      `}</style>
    </div>
  );
}
