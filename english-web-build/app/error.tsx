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
          <section className="BeaconVie-card w-full p-8 text-center">
            <p className="text-sm font-black uppercase tracking-wide text-[var(--BeaconVie-danger)]">
              CÃ³ lá»—i xáº£y ra
            </p>
            <h1 className="mt-3 text-3xl font-black text-[var(--BeaconVie-ink)]">
              Trang nÃ y chÆ°a táº£i Ä‘Æ°á»£c
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-sm font-semibold leading-6 text-[var(--BeaconVie-muted)]">
              Báº¡n thá»­ táº£i láº¡i nhÃ©. Náº¿u lá»—i váº«n cÃ²n, há»‡ thá»‘ng sáº½ cáº§n kiá»ƒm tra log
              á»Ÿ phÃ­a mÃ¡y chá»§.
            </p>
            <button
              type="button"
              onClick={reset}
              className="BeaconVie-button-primary mt-6"
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
