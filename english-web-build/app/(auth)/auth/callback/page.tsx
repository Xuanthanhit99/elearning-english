"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function AuthCallbackPage() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const status = params.get("status");

    if (status === "success") {
      router.replace("/");
      return;
    }

    router.replace("/auth?error=google_login_failed");
  }, [params, router]);

  return <div>Đang xử lý đăng nhập...</div>;
}