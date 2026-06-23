"use client";

import Image from "next/image";
import Link from "next/link";
import { useAuthStore } from "@/src/store/authStore";
import { api } from "@/src/lib/axios";

export default function Header() {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);

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
      <div className="mx-auto flex max-w-7xl items-center justify-between rounded-[28px] bg-white px-7 py-4 shadow-sm">
        <Link href="/" className="text-3xl font-black tracking-tight">
          <span className="text-black">Miu</span>
          <span className="text-[#ff6b00]">Lingo</span>
        </Link>

        <nav className="hidden items-center gap-9 lg:flex">
          <Link
            href="/"
            className="border-b-4 border-[#ff6b00] pb-2 font-extrabold text-[#1f2a44]"
          >
            Trang chủ
          </Link>

          <Link href="/courses" className="font-extrabold text-[#5b6b85]">
            Khóa học
          </Link>

          <details className="group relative">
            <summary className="flex cursor-pointer list-none items-center gap-1 font-extrabold text-[#5b6b85] hover:text-[#1f2a44]">
              Công cụ
              <span className="text-xs transition group-open:rotate-180">
                ▼
              </span>
            </summary>

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
                  href: "/placement-test",
                },
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
            </div>
          </details>

          <Link href="/roadmap" className="font-extrabold text-[#5b6b85]">
            Lộ trình
          </Link>
        </nav>

        <div className="flex items-center gap-3">
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
                    src={user.avatar || "/avatar-default.png"}
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
                      src={user.avatar || "/avatar-default.png"}
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
                className="hidden rounded-full px-5 py-3 font-extrabold text-[#5b6b85] hover:bg-[#fff4e8] sm:block"
              >
                Đăng nhập
              </Link>

              <Link
                href="/auth"
                className="rounded-full bg-[#ff6b00] px-7 py-3 font-bold text-white"
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