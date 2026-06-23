"use client";
import Header from "@/src/Components/HomePage/Header";
import { useEffect } from "react";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  
useEffect(() => {
  const getMe = async () => {
    try {
      const res = await fetch(
        "http://localhost:3002/auth/me",
        {
          method: "GET",
          credentials: "include",
        },
      );

      const user = await res.json();

      console.log(user);
    } catch (error) {
      console.error(error);
    }
  };

  getMe();
}, []);
  return (
    <>
      <Header />
      {children}
    </>
  );
}