"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError("");

    if (password.length < 6) {
      setError("Máº­t kháº©u pháº£i cÃ³ Ã­t nháº¥t 6 kÃ½ tá»±.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Máº­t kháº©u xÃ¡c nháº­n khÃ´ng khá»›p.");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/auth/reset-password", { token, password });
      setSuccess(true);
      setTimeout(() => router.replace("/login"), 2500);
    } catch (err: unknown) {
      setError(
        getErrorMessage(
          err,
          "LiÃªn káº¿t Ä‘áº·t láº¡i máº­t kháº©u khÃ´ng há»£p lá»‡ hoáº·c Ä‘Ã£ háº¿t háº¡n.",
        ),
      );
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
          Äáº·t láº¡i máº­t kháº©u
        </h1>

        {!token ? (
          <>
            <p className="mt-3 text-sm font-semibold leading-6 text-[var(--BeaconVie-muted)]">
              LiÃªn káº¿t Ä‘áº·t láº¡i máº­t kháº©u khÃ´ng há»£p lá»‡. Vui lÃ²ng yÃªu cáº§u má»™t liÃªn káº¿t
              má»›i.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href="/forgot-password" className="BeaconVie-button-primary flex-1 text-center">
                YÃªu cáº§u liÃªn káº¿t má»›i
              </Link>
            </div>
          </>
        ) : success ? (
          <>
            <p className="mt-3 text-sm font-semibold leading-6 text-[var(--BeaconVie-muted)]">
              Äáº·t láº¡i máº­t kháº©u thÃ nh cÃ´ng. Má»i phiÃªn Ä‘Äƒng nháº­p trÆ°á»›c Ä‘Ã³ Ä‘Ã£ bá»‹ Ä‘Äƒng
              xuáº¥t â€” Ä‘ang chuyá»ƒn Ä‘áº¿n trang Ä‘Äƒng nháº­p...
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href="/login" className="BeaconVie-button-primary flex-1 text-center">
                ÄÄƒng nháº­p ngay
              </Link>
            </div>
          </>
        ) : (
          <>
            <p className="mt-3 text-sm font-semibold leading-6 text-[var(--BeaconVie-muted)]">
              Nháº­p máº­t kháº©u má»›i cho tÃ i khoáº£n cá»§a báº¡n.
            </p>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <label className="block">
                <span className="font-extrabold text-[var(--BeaconVie-muted)]">
                  Máº­t kháº©u má»›i
                </span>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-[var(--BeaconVie-border)] bg-[var(--BeaconVie-card-soft)] px-5 py-4 font-bold text-[var(--BeaconVie-ink)] outline-none transition placeholder:text-[var(--BeaconVie-muted)] focus:border-[var(--BeaconVie-primary)] focus:bg-[var(--BeaconVie-card)]"
                />
              </label>

              <label className="block">
                <span className="font-extrabold text-[var(--BeaconVie-muted)]">
                  XÃ¡c nháº­n máº­t kháº©u má»›i
                </span>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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
                {submitting ? "Äang xá»­ lÃ½..." : "Äáº·t láº¡i máº­t kháº©u"}
              </button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}
