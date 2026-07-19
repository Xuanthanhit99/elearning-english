import type React from "react";
import { useEffect, useState } from "react";
import axiosClient from "../api/axiosClient";
import { clearCurrentUser, setCurrentUser } from "../api/tokenStore";

export default function AuthLoader({
  children,
}: {
  children: React.ReactNode;
}) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axiosClient
      .get("/auth/me")
      .then((res) => {
        setCurrentUser(res.data);
      })
      .catch(() => {
        clearCurrentUser();
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div>Đang kiểm tra đăng nhập...</div>;
  }

  return children;
}
