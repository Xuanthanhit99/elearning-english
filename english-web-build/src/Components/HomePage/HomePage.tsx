// src/app/page.tsx
'use client'
import { useAuthStore } from "@/src/store/authStore";
import Image from "next/image";

export default function HomePage() {
  const user = useAuthStore((state) => state.user)
  return (
    <main className="overflow-hidden bg-gradient-to-b from-[#fff4e8] via-[#fffaf5] to-white">
      {" "}
      <section className="relative mx-auto grid min-h-[calc(100vh-92px)] max-w-6xl grid-cols-1 items-center gap-10 px-4 py-12 lg:grid-cols-2">
        <div>
          <div className="mb-5 inline-flex rounded-full border border-orange-200 bg-white px-4 py-2 font-bold text-orange-500 shadow-sm">
            🐱 Linh vật Miu đồng hành cùng bạn
          </div>

          <h2 className="text-4xl font-extrabold leading-tight text-slate-800 sm:text-5xl lg:text-6xl">
            Học tiếng Anh vui hơn cùng{" "}
            <span className="bg-gradient-to-r from-orange-500 to-yellow-400 bg-clip-text text-transparent">
              MiuLingo
            </span>
          </h2>

          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-500">
            Học miễn phí, check bài miễn phí, check từ miễn phí. Giao diện dễ
            thương, gần gũi và phù hợp cho người mới bắt đầu.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <button className="rounded-2xl bg-orange-500 px-7 py-4 font-bold text-white shadow-xl shadow-orange-200">
              Bắt đầu học miễn phí
            </button>

            <button className="rounded-2xl bg-white px-7 py-4 font-bold text-orange-500 shadow-md">
              Xem khóa học
            </button>
          </div>
        </div>

        <div className="relative rounded-[36px] border border-orange-100 bg-white/80 p-6 shadow-2xl">
          <div className="absolute left-6 top-8 rounded-2xl bg-white px-4 py-3 font-extrabold text-orange-500 shadow-lg">
            🇬🇧 Hello
          </div>

          <div className="absolute right-6 top-16 rounded-2xl bg-white px-4 py-3 font-extrabold text-emerald-500 shadow-lg">
            +80 XP
          </div>

          <div className="flex justify-center pt-12">
            <Image
              src={user && user.avatar ? user.avatar : "/cat-home.jpg"}
              alt="Miu mascot"
              width={320}
              height={320}
              className="rounded-full object-cover drop-shadow-2xl"
            />
          </div>

          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-extrabold text-slate-800">
                Nhiệm vụ hôm nay
              </h3>
              <span className="rounded-full bg-orange-100 px-3 py-1 font-bold text-orange-500">
                Level 04
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between rounded-2xl bg-slate-50 p-4 font-bold text-slate-600">
                <span>🎧 Nghe 3 câu hội thoại</span>
                <span className="text-green-500">Done</span>
              </div>

              <div className="flex justify-between rounded-2xl bg-slate-50 p-4 font-bold text-slate-600">
                <span>🧩 Ghép 5 từ mới</span>
                <span className="text-green-500">Done</span>
              </div>

              <div className="flex justify-between rounded-2xl bg-slate-50 p-4 font-bold text-slate-600">
                <span>🗣️ Nói lại mẫu câu</span>
                <span>Next</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
