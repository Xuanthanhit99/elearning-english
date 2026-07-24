"use client";

import WelcomeLoginModal from "@/src/Components/WelcomeLoginModal";
import { redirectToLogin } from "@/src/lib/axios";
import { initializeAuth } from "@/src/lib/auth-init";
import { useTranslation } from "@/src/hooks/useTranslation";
import { useAuthStore } from "@/src/store/authStore";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import ResponsiveContainer from "../UI/ResponsiveContainer";
import AppHeader from "./AppHeader";
import AppSidebar from "./AppSidebar";
import MobileNavigation from "./MobileNavigation";
import MiuChatWidget from "@/src/Components/MiuChatModal/MiuChatWidget";

function AppShellLoading() {
  return (
    <div className="min-h-screen bg-[var(--lumiverse-bg)] p-4 lg:p-6">
      <div className="mx-auto max-w-6xl space-y-5 pt-20 lg:pl-[280px]">
        <div className="h-28 animate-pulse rounded-[2rem] bg-white/70 dark:bg-white/8" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-28 animate-pulse rounded-3xl bg-white/70 dark:bg-white/8"
            />
          ))}
        </div>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="h-80 animate-pulse rounded-3xl bg-white/70 dark:bg-white/8" />
          <div className="h-80 animate-pulse rounded-3xl bg-white/70 dark:bg-white/8" />
        </div>
      </div>
    </div>
  );
}

function AppShellAuthError({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--lumiverse-bg)] p-4">
      <div className="max-w-md rounded-3xl border border-[var(--lumiverse-border)] bg-white p-6 text-center shadow-sm dark:bg-white/8">
        <h1 className="text-2xl font-black text-[var(--lumiverse-ink)]">
          {t("common.authSessionErrorTitle")}
        </h1>
        <p className="mt-3 text-sm font-bold leading-6 text-[var(--lumiverse-muted)]">
          {t("common.authSessionErrorDescription")}
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="lumiverse-button-primary mt-5 w-full"
        >
          {t("common.tryAgain")}
        </button>
      </div>
    </div>
  );
}

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const authStatus = useAuthStore((state) => state.status);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("sidebar-collapsed") === "true";
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [prevAuthStatus, setPrevAuthStatus] = useState(authStatus);
  const focusMode = pathname.startsWith("/placement/test/");

  // Adjust state during render (React's endorsed pattern for reacting to a
  // value change) instead of in an effect, so showing the welcome modal
  // once per session doesn't need a setState-in-effect side effect.
  if (authStatus !== prevAuthStatus) {
    setPrevAuthStatus(authStatus);
    if (authStatus === "authenticated" && user && !sessionStorage.getItem("welcome_shown")) {
      sessionStorage.setItem("welcome_shown", "true");
      setShowWelcome(true);
    }
  }

  useEffect(() => {
    if (authStatus === "idle") {
      void initializeAuth();
    }
  }, [authStatus]);

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      redirectToLogin();
    }
  }, [authStatus]);

  function handleSidebarCollapsed(value: boolean) {
    setSidebarCollapsed(value);
    localStorage.setItem("sidebar-collapsed", String(value));
  }

  if (authStatus === "error") {
    return <AppShellAuthError onRetry={() => void initializeAuth()} />;
  }
  if (!user) return <AppShellLoading />;

  return (
    <div className="lumiverse-shell min-h-screen">
      {focusMode ? null : (
        <AppSidebar
          collapsed={sidebarCollapsed}
          mobileOpen={mobileOpen}
          onCollapsedChange={handleSidebarCollapsed}
          onMobileOpenChange={setMobileOpen}
        />
      )}

      {focusMode ? null : (
        <AppHeader
          sidebarCollapsed={sidebarCollapsed}
          onOpenMobileMenu={() => setMobileOpen(true)}
        />
      )}

      <WelcomeLoginModal
        open={showWelcome}
        fullname={user?.fullname}
        avatar="/cat-home.jpg"
        onClose={() => setShowWelcome(false)}
      />
      <main
        className={[
          "app-shell-content single-menu-content min-h-screen transition-[padding-left] duration-300",
          focusMode
            ? "pb-0 pt-0"
            : "pb-24 pt-[76px] lg:pb-0",
          focusMode ? "" : sidebarCollapsed ? "lg:pl-[96px]" : "lg:pl-[280px]",
        ].join(" ")}
      >
        <ResponsiveContainer className={focusMode ? "max-w-none px-0 py-0 sm:px-0 sm:py-0 md:px-0 lg:px-0 lg:py-0" : ""}>
          {children}
        </ResponsiveContainer>
      </main>

      {focusMode ? null : <MobileNavigation onOpenMenu={() => setMobileOpen(true)} />}
      {focusMode ? null : <MiuChatWidget />}

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
