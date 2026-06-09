import type React from "react";
import { useEffect, useState } from "react";
import axiosClient from "../api/axiosClient";
import { setAccessToken, setCurrentUser } from "../api/tokenStore";

export default function AuthLoader({
  children,
}: {
  children: React.ReactNode;
}) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axiosClient
      .post("/auth/refresh")
      .then((res) => {
        setAccessToken(res.data.accessToken);
        setCurrentUser(res.data.user);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div>Đang kiểm tra đăng nhập...</div>;
  }

  return children;
}
