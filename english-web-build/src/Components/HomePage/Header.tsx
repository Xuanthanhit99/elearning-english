"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/src/store/authStore";
import { useEffect, useRef, useState } from "react";
import LearningPetPanel from "@/src/Components/Pets/LearningPetPanel";
import AppLogo from "@/src/Components/UI/AppLogo";
import { api } from "@/src/lib/axios";

export default function Header() {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);

  const [openTools, setOpenTools] = useState(false);
  const toolsRef = useRef<HTMLDivElement | null>(null);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const isToolsActive =
    pathname.startsWith("/check") ||
    pathname.startsWith("/dictionary") ||
    pathname.startsWith("/pronunciation") ||
    pathname.startsWith("/placement") ||
    pathname.startsWith("/placement-test");

  useEffect(() => {
    setOpenTools(false);
  }, [pathname]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        toolsRef.current &&
        !toolsRef.current.contains(event.target as Node)
      ) {
        setOpenTools(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.error(error);
    } finally {
      setUser(null);
      window.location.href = "/";
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-[#fff4e8] px-4 py-3">
      <div className="mx-auto grid max-w-7xl grid-cols-[220px_1fr_320px] items-center rounded-[28px] bg-white px-7 py-4 shadow-sm">
        <AppLogo />

        <nav className="flex items-center justify-center gap-10">
          <Link
            href="/"
            className={`whitespace-nowrap pb-2 font-extrabold ${
              isActive("/")
                ? "border-b-4 border-[#ff6b00] text-[#1f2a44]"
                : "text-[#5b6b85]"
            }`}
          >
            Trang chủ
          </Link>

          <Link
            href="/courses"
            className={`whitespace-nowrap pb-2 font-extrabold ${
              isActive("/courses")
                ? "border-b-4 border-[#ff6b00] text-[#1f2a44]"
                : "text-[#5b6b85]"
            }`}
          >
            Khóa học
          </Link>

          <div ref={toolsRef} className="relative pb-2">
            <button
              type="button"
              onClick={() => setOpenTools((prev) => !prev)}
              className={`flex items-center gap-1 whitespace-nowrap font-extrabold ${
                isToolsActive
                  ? "border-b-4 border-[#ff6b00] text-[#1f2a44]"
                  : "text-[#5b6b85]"
              }`}
            >
              Công cụ
              <span
                className={`text-xs transition ${
                  openTools ? "rotate-180" : ""
                }`}
              >
                ▼
              </span>
            </button>

            {openTools && (
              <div className="absolute left-1/2 top-10 z-50 w-64 -translate-x-1/2 rounded-[24px] border border-[#ead8c2] bg-white p-3 shadow-[0_24px_70px_rgba(31,42,68,0.14)]">
                {[
                  { icon: "🔤", label: "Check từ", href: "/check-word" },
                  { icon: "📝", label: "Check bài", href: "/check-writing" },
                  { icon: "📚", label: "Từ điển AI", href: "/dictionary" },
                  {
                    icon: "🎙️",
                    label: "Luyện phát âm",
                    href: "/pronunciation",
                  },
                  {
                    icon: "📊",
                    label: "Kiểm tra trình độ",
                    href: "/placement",
                  },
                  { icon: "🐱", label: "Thú cưng học tập", href: "/pet" },
                ].map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpenTools(false)}
                    className="flex items-center gap-3 rounded-2xl px-4 py-3 font-extrabold text-[#1f2a44] transition hover:bg-[#fff4e8] hover:text-[#ff6b00]"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#fff4e8] text-lg">
                      {item.icon}
                    </span>
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <Link
            href="/roadmap"
            className={`whitespace-nowrap pb-2 font-extrabold ${
              isActive("/roadmap")
                ? "border-b-4 border-[#ff6b00] text-[#1f2a44]"
                : "text-[#5b6b85]"
            }`}
          >
            Lộ trình
          </Link>
        </nav>

        <div className="flex items-center justify-end gap-4 whitespace-nowrap">
          {user ? (
            <>
              <button
                type="button"
                className="flex h-12 w-12 items-center justify-center rounded-full bg-[#fff4e8] text-xl"
              >
                🔔
              </button>

              <div className="hidden items-center gap-2 rounded-full bg-[#fff0dc] px-4 py-3 font-extrabold text-[#ff6b00] sm:flex">
                🔥 <span>12</span>
              </div>

              <details className="group relative">
                <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full bg-[#1f2a44] px-3 py-2 text-white">
                  <Image
                    src={user.avatar || "/cat-home.jpg"}
                    alt={user.fullname || "User"}
                    width={38}
                    height={38}
                    className="h-[38px] w-[38px] rounded-full bg-white object-cover"
                  />

                  <span className="hidden max-w-[90px] truncate font-extrabold sm:block">
                    {user.fullname || "User"}
                  </span>

                  <span className="text-xs transition group-open:rotate-180">
                    ▼
                  </span>
                </summary>

                <div className="absolute right-0 top-14 z-50 w-72 rounded-[24px] border border-[#ead8c2] bg-white p-3 shadow-[0_24px_70px_rgba(31,42,68,0.14)]">
                  <div className="mb-2 flex items-center gap-3 rounded-2xl bg-[#fff4e8] p-3">
                    <Image
                      src={user.avatar || "/cat-home.jpg"}
                      alt={user.fullname || "User"}
                      width={44}
                      height={44}
                      className="h-11 w-11 rounded-full bg-white object-cover"
                    />

                    <div className="min-w-0">
                      <p className="truncate font-extrabold text-[#1f2a44]">
                        {user.fullname || "User"}
                      </p>
                      <p className="truncate text-sm font-bold text-[#5b6b85]">
                        {user.email}
                      </p>
                    </div>
                  </div>

                  {[
                    { icon: "👤", label: "Hồ sơ cá nhân", href: "/profile" },
                    { icon: "📈", label: "Tiến độ học", href: "/progress" },
                    { icon: "🏆", label: "Chứng chỉ", href: "/certificates" },
                    { icon: "⚙️", label: "Cài đặt", href: "/settings" },
                  ].map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center gap-3 rounded-2xl px-4 py-3 font-extrabold text-[#1f2a44] transition hover:bg-[#fff4e8] hover:text-[#ff6b00]"
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#fff4e8] text-lg">
                        {item.icon}
                      </span>
                      {item.label}
                    </Link>
                  ))}

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="mt-1 flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left font-extrabold text-red-500 transition hover:bg-red-50"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-lg">
                      🚪
                    </span>
                    Đăng xuất
                  </button>
                </div>
              </details>
            </>
          ) : (
            <>
              <Link
                href="/auth"
                className="inline-flex items-center justify-center rounded-full px-5 py-3 font-extrabold text-[#5b6b85] hover:bg-[#fff4e8] hover:text-[#1f2a44]"
              >
                Đăng nhập
              </Link>

              <Link
                href="/auth"
                className="inline-flex items-center justify-center rounded-full bg-[#ff6b00] px-7 py-3 font-extrabold text-white shadow-lg shadow-orange-200"
              >
                Bắt đầu học ngay
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
