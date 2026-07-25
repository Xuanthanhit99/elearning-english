"use client";

import { useState } from "react";
import Link from "next/link";
import AppLogo from "@/src/Components/UI/AppLogo";
import { api } from "@/src/lib/axios";

function getErrorMessage(error: unknown, fallback: string) {
  if (
    error &&
    typeof error === "object" &&
    "response" in error &&
    error.response &&
    typeof error.response === "object" &&
    "data" in error.response
  ) {
    const data = error.response.data as { message?: unknown };
    if (typeof data.message === "string") return data.message;
  }
  return fallback;
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError("");
    setSubmitting(true);
    try {
      // The backend always returns the same generic message regardless of
      // whether the email exists â€” this UI shows that exact response as-is
      // rather than branching on it, so it can't become an enumeration leak.
      await api.post("/auth/forgot-password", { email });
      setSubmitted(true);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "KhÃ´ng thá»ƒ gá»­i yÃªu cáº§u. Vui lÃ²ng Thử lại."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--BeaconVie-bg)] p-4">
      <section className="w-full max-w-lg rounded-[28px] border border-[var(--BeaconVie-border)] bg-[var(--BeaconVie-card)] p-6 shadow-[0_30px_90px_rgba(31,42,68,0.12)] dark:shadow-black/30 sm:p-8">
        <div className="mb-8 flex justify-center">
          <AppLogo href="/" />
        </div>

        <h1 className="text-3xl font-black text-[var(--BeaconVie-ink)]">
          QuÃªn máº­t kháº©u
        </h1>

        {submitted ? (
          <>
            <p className="mt-3 text-sm font-semibold leading-6 text-[var(--BeaconVie-muted)]">
              Náº¿u email tá»“n táº¡i trong há»‡ thá»‘ng, chÃºng tÃ´i Ä‘Ã£ gá»­i hÆ°á»›ng dáº«n Ä‘áº·t láº¡i
              máº­t kháº©u. Vui lÃ²ng kiá»ƒm tra há»™p thÆ° (vÃ  má»¥c spam).
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href="/login" className="BeaconVie-button-primary flex-1 text-center">
                Quay láº¡i Ä‘Äƒng nháº­p
              </Link>
            </div>
          </>
        ) : (
          <>
            <p className="mt-3 text-sm font-semibold leading-6 text-[var(--BeaconVie-muted)]">
              Nháº­p email tÃ i khoáº£n cá»§a báº¡n, chÃºng tÃ´i sáº½ gá»­i liÃªn káº¿t Ä‘áº·t láº¡i máº­t
              kháº©u náº¿u email nÃ y tá»“n táº¡i trong há»‡ thá»‘ng.
            </p>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <label className="block">
                <span className="font-extrabold text-[var(--BeaconVie-muted)]">Email</span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ban@example.com"
                  className="mt-2 w-full rounded-2xl border border-[var(--BeaconVie-border)] bg-[var(--BeaconVie-card-soft)] px-5 py-4 font-bold text-[var(--BeaconVie-ink)] outline-none transition placeholder:text-[var(--BeaconVie-muted)] focus:border-[var(--BeaconVie-primary)] focus:bg-[var(--BeaconVie-card)]"
                />
              </label>

              {error && (
                <p className="text-sm font-bold text-rose-600" role="alert">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-2xl bg-gradient-to-r from-[var(--BeaconVie-primary)] to-[var(--BeaconVie-violet)] py-4 font-extrabold text-white shadow-xl shadow-blue-200/70 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60 dark:shadow-black/20"
              >
                {submitting ? "Äang gá»­i..." : "Gá»­i liÃªn káº¿t Ä‘áº·t láº¡i máº­t kháº©u"}
              </button>
            </form>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href="/login" className="BeaconVie-button-soft flex-1 text-center">
                Quay láº¡i Ä‘Äƒng nháº­p
              </Link>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
