"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const status = searchParams.get("status");

    if (status === "success") {
      router.replace("/");
      return;
    }

    router.replace("/auth?error=social_login_failed");
  }, [searchParams, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mb-4">Đang xử lý đăng nhập...</div>
      </div>
    </div>
  );
}
