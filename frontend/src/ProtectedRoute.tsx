import type React from "react";
import { getAccessToken } from "./api/tokenStore";
import { Navigate } from "react-router-dom";

type Props = {
  children: React.ReactNode;
};

export default function ProtectedRoute({ children }: Props) {
  const token = getAccessToken();
  console.log("token", token);
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}
