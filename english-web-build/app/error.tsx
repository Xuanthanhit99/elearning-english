"use client";

import { RefreshCcw } from "lucide-react";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="vi">
      <body className="min-h-screen bg-[#fff4e8] p-6">
        <main className="mx-auto flex min-h-[calc(100vh-48px)] max-w-3xl items-center justify-center">
          <section className="w-full rounded-[28px] border border-rose-100 bg-white p-8 text-center shadow-xl shadow-rose-100">
            <p className="text-sm font-black uppercase tracking-wide text-rose-500">
              Có lỗi xảy ra
            </p>
            <h1 className="mt-3 text-3xl font-black text-slate-950">
              Trang này chưa tải được
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-sm font-semibold leading-6 text-slate-500">
              Bạn thử tải lại nhé. Nếu lỗi vẫn còn, hệ thống sẽ cần kiểm tra log
              ở phía máy chủ.
            </p>
            <button
              type="button"
              onClick={reset}
              className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 font-black text-white shadow-lg shadow-violet-100"
            >
              <RefreshCcw size={18} />
              Thử lại
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
