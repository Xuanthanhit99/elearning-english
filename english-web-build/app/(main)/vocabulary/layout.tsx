"use client";

import { ReactNode } from "react";
import { TopBar, VocabularySidebar } from "@/src/Components/Vocabulary/VocabularyPage";
import { useAuthStore } from "@/src/store/authStore";

export default function VocabularyLayout({ children }: { children: ReactNode }) {
  const user = useAuthStore((state) => state.user);
  const displayName = user?.fullname || "Minh Anh";
  const avatar = user?.avatar || "/avatar-default.png";

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#fbfbff] text-[#101733]">
      <div className="mx-auto flex min-h-screen max-w-[1920px]">
        <VocabularySidebar />
        <section className="min-w-0 flex-1">
          <TopBar displayName={displayName} avatar={avatar} />
          {children}
        </section>
      </div>
    </main>
  );
}
