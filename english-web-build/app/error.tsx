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
      <body className="min-h-screen p-6">
        <main className="mx-auto flex min-h-[calc(100vh-48px)] max-w-3xl items-center justify-center">
          <section className="lumiverse-card w-full p-8 text-center">
            <p className="text-sm font-black uppercase tracking-wide text-rose-500">
              Có lỗi xảy ra
            </p>
            <h1 className="mt-3 text-3xl font-black text-[var(--lumiverse-ink)]">
              Trang này chưa tải được
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-sm font-semibold leading-6 text-[var(--lumiverse-muted)]">
              Bạn thử tải lại nhé. Nếu lỗi vẫn còn, hệ thống sẽ cần kiểm tra log
              ở phía máy chủ.
            </p>
            <button
              type="button"
              onClick={reset}
              className="lumiverse-button-primary mt-6"
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
