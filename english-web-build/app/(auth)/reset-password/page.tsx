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
      setError("Mật khẩu phải có ít nhất 6 ký tự.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
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
          "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.",
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
          Đặt lại mật khẩu
        </h1>

        {!token ? (
          <>
            <p className="mt-3 text-sm font-semibold leading-6 text-[var(--BeaconVie-muted)]">
              Liên kết đặt lại mật khẩu không hợp lệ. Vui lòng yêu cầu một liên kết
              mới.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href="/forgot-password" className="BeaconVie-button-primary flex-1 text-center">
                Yêu cầu liên kết mới
              </Link>
            </div>
          </>
        ) : success ? (
          <>
            <p className="mt-3 text-sm font-semibold leading-6 text-[var(--BeaconVie-muted)]">
              Đặt lại mật khẩu thành công. Mọi phiên đăng nhập trước đó đã bị đăng
              xuất — đang chuyển đến trang đăng nhập...
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href="/login" className="BeaconVie-button-primary flex-1 text-center">
                ?ăng nhập ngay
              </Link>
            </div>
          </>
        ) : (
          <>
            <p className="mt-3 text-sm font-semibold leading-6 text-[var(--BeaconVie-muted)]">
              Nhập mật khẩu mới cho tài khoản của bạn.
            </p>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <label className="block">
                <span className="font-extrabold text-[var(--BeaconVie-muted)]">
                  Mật khẩu mới
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
                  Xác nhận mật khẩu mới
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
                {submitting ? "Đang xử lý..." : "Đặt lại mật khẩu"}
              </button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}
