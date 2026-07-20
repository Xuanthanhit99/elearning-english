"use client";

import WelcomeLoginModal from "@/src/Components/WelcomeLoginModal";
import { api } from "@/src/lib/axios";
import { useAuthStore } from "@/src/store/authStore";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import ResponsiveContainer from "../UI/ResponsiveContainer";
import AppHeader from "./AppHeader";
import AppSidebar from "./AppSidebar";
import MobileNavigation from "./MobileNavigation";

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

function AppShellAuthError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--lumiverse-bg)] p-4">
      <div className="max-w-md rounded-3xl border border-[var(--lumiverse-border)] bg-white p-6 text-center shadow-sm dark:bg-white/8">
        <h1 className="text-2xl font-black text-[var(--lumiverse-ink)]">
          Khong the xac minh phien dang nhap
        </h1>
        <p className="mt-3 text-sm font-bold leading-6 text-[var(--lumiverse-muted)]">
          May chu dang tam thoi khong phan hoi. Hay thu lai de tranh dang xuat
          nham khi phien cua ban van con hieu luc.
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="lumiverse-button-primary mt-5 w-full"
        >
          Thu lai
        </button>
      </div>
    </div>
  );
}

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const authStatus = useAuthStore((state) => state.status);
  const setUser = useAuthStore((state) => state.setUser);
  const setAuthStatus = useAuthStore((state) => state.setStatus);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("sidebar-collapsed") === "true";
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authCheckAttempt, setAuthCheckAttempt] = useState(0);
  const focusMode = pathname.startsWith("/placement/test/");

  useEffect(() => {
    let active = true;

    const getMe = async () => {
      try {
        setCheckingAuth(true);
        setAuthStatus("loading");
        const res = await api.get("/auth/me");
        if (!active) return;
        const currentUser = res.data.data.getUser;
        setUser(currentUser);

        const hasShownWelcome = sessionStorage.getItem("welcome_shown");
        if (!hasShownWelcome) {
          setShowWelcome(true);
          sessionStorage.setItem("welcome_shown", "true");
        }
      } catch (error) {
        console.error(error);
        if (!active) return;
        const status = getHttpStatus(error);
        if (status && status >= 500) {
          setAuthStatus("error");
        } else {
          setUser(null);
        }
      } finally {
        if (active) setCheckingAuth(false);
      }
    };

    getMe();
    return () => {
      active = false;
    };
  }, [authCheckAttempt, setAuthStatus, setUser]);

  function handleSidebarCollapsed(value: boolean) {
    setSidebarCollapsed(value);
    localStorage.setItem("sidebar-collapsed", String(value));
  }

  if (checkingAuth) return <AppShellLoading />;
  if (!user && authStatus === "error") {
    return (
      <AppShellAuthError
        onRetry={() => {
          setCheckingAuth(true);
          setAuthStatus("loading");
          setAuthCheckAttempt((value) => value + 1);
        }}
      />
    );
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
