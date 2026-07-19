import { useEffect, useState } from "react";
import type React from "react";
import { Navigate } from "react-router-dom";
import axiosClient from "./api/axiosClient";
import { clearCurrentUser, setCurrentUser } from "./api/tokenStore";

type Props = {
  children: React.ReactNode;
};

export default function ProtectedRoute({ children }: Props) {
  const [status, setStatus] = useState<"loading" | "authenticated" | "guest">(
    "loading",
  );

  useEffect(() => {
    let mounted = true;

    axiosClient
      .get("/auth/me")
      .then((res) => {
        if (!mounted) return;
        setCurrentUser(res.data);
        setStatus("authenticated");
      })
      .catch(() => {
        if (!mounted) return;
        clearCurrentUser();
        setStatus("guest");
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (status === "loading") {
    return <div>Đang kiểm tra đăng nhập...</div>;
  }

  if (status === "guest") {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
