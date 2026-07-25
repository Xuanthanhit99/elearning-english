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
      // whether the email exists — this UI shows that exact response as-is
      // rather than branching on it, so it can't become an enumeration leak.
      await api.post("/auth/forgot-password", { email });
      setSubmitted(true);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Không thể gửi yêu cầu. Vui lòng Thử lại."));
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
          Quên mật khẩu
        </h1>

        {submitted ? (
          <>
            <p className="mt-3 text-sm font-semibold leading-6 text-[var(--BeaconVie-muted)]">
              Nếu email tồn tại trong hệ thống, chúng tôi đã gửi hướng dẫn đặt lại
              mật khẩu. Vui lòng kiểm tra hộp thư (và mục spam).
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href="/login" className="BeaconVie-button-primary flex-1 text-center">
                Quay lại đăng nhập
              </Link>
            </div>
          </>
        ) : (
          <>
            <p className="mt-3 text-sm font-semibold leading-6 text-[var(--BeaconVie-muted)]">
              Nhập email tài khoản của bạn, chúng tôi sẽ gửi liên kết đặt lại mật
              khẩu nếu email này tồn tại trong hệ thống.
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
                {submitting ? "Đang gửi..." : "Gửi liên kết đặt lại mật khẩu"}
              </button>
            </form>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href="/login" className="BeaconVie-button-soft flex-1 text-center">
                Quay lại đăng nhập
              </Link>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
