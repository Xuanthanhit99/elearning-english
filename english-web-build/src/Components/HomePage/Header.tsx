// src/components/Header.tsx
import { ROUTES } from "@/src/constants/routes";
import Image from "next/image";
import Link from "next/link";

const navs = [
  { label: "Trang chủ", href: "/" },
  { label: "Khóa học", href: "/courses" },
  { label: "Tính năng", href: "/roadmap" },
  { label: "Về chúng tôi", href: "/about" },
];

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-[#f2dfc8] bg-[#fff4e8] py-2">
      {" "}
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-8 lg:flex-row lg:justify-between">
        {/* Logo */}
        <Link href="/" className="flex flex-col items-center lg:items-start">
          <div className="flex items-center gap-4">
            <Image
              src="/cat-home.jpg"
              alt="MiuLingo mascot"
              width={72}
              height={72}
              className="rounded-full object-cover"
              priority
            />

            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
              <span className="text-slate-500">Miu</span>
              <span className="text-orange-500">Lingo</span>
            </h1>
          </div>

          <p className="mt-2 text-center text-lg font-bold text-slate-500 sm:text-xl lg:pl-10">
            Học ngôn ngữ cùng Miu
          </p>
        </Link>

        {/* Menu box */}
        <div className="rounded-[30px] border border-[#ead8c2] bg-[#fffaf5] px-4 py-3 shadow-md sm:px-6">
          <nav
            className=" flex
    flex-wrap
    items-center
    justify-center
    gap-3
    lg:flex-nowrap
    lg:gap-6"
          >
            {navs.map((item, index) => (
              <Link
                key={item.href}
                href={item.href}
                className={
                  index === 0
                    ? "rounded-full border-2 border-black bg-slate-50 px-7 py-3 text-sm font-bold text-slate-700 sm:text-base whitespace-nowrap"
                    : "rounded-full px-4 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 sm:text-base whitespace-nowrap"
                }
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="mt-4 flex items-center justify-center gap-4 sm:gap-6">
            <Link
              href={ROUTES.LOGIN}
              className="rounded-full px-5 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 sm:text-base"
            >
              Đăng nhập
            </Link>

            <Link
              href={ROUTES.LOGIN}
              className="rounded-full bg-orange-500 px-9 py-3 text-sm font-bold text-white shadow-lg shadow-orange-200 transition hover:bg-orange-600 sm:px-12 sm:text-base"
            >
              Bắt đầu học ngay
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
