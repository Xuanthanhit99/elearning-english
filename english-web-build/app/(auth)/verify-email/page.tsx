"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailContent />
    </Suspense>
  );
}

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    token ? "loading" : "error",
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) return;
    let active = true;
    api
      .post("/auth/verify-email", { token })
      .then(() => {
        if (active) setStatus("success");
      })
      .catch((error: unknown) => {
        if (active) {
          setStatus("error");
          setMessage(
            getErrorMessage(
              error,
              "Liên kết xác minh email không hợp lệ hoặc đã hết hạn.",
            ),
          );
        }
      });
    return () => {
      active = false;
    };
  }, [token]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--BeaconVie-bg)] p-4">
      <section className="w-full max-w-lg rounded-[28px] border border-[var(--BeaconVie-border)] bg-[var(--BeaconVie-card)] p-6 text-center shadow-[0_30px_90px_rgba(31,42,68,0.12)] dark:shadow-black/30 sm:p-8">
        <div className="mb-8 flex justify-center">
          <AppLogo href="/" />
        </div>

        <h1 className="text-3xl font-black text-[var(--BeaconVie-ink)]">
          Xác minh email
        </h1>

        {status === "loading" && (
          <p className="mt-3 text-sm font-semibold leading-6 text-[var(--BeaconVie-muted)]">
            Đang xác minh email của bạn...
          </p>
        )}

        {status === "success" && (
          <p className="mt-3 text-sm font-semibold leading-6 text-[var(--BeaconVie-muted)]">
            Xác minh email thành công. Cảm ơn bạn!
          </p>
        )}

        {status === "error" && (
          <p className="mt-3 text-sm font-semibold leading-6 text-rose-600">
            {message || "Liên kết xác minh email không hợp lệ hoặc đã hết hạn."}
          </p>
        )}

        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <Link href="/dashboard" className="BeaconVie-button-primary flex-1 text-center">
            Đến trang chủ
          </Link>
        </div>
      </section>
    </main>
  );
}
