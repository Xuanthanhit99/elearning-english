"use client";

import { ReactNode } from "react";
import { TopBar, VocabularySidebar } from "@/src/Components/Vocabulary/VocabularyPage";
import { useAuthStore } from "@/src/store/authStore";

export default function CheckWordLayout({ children }: { children: ReactNode }) {
  const user = useAuthStore((state) => state.user);
  const displayName = user?.fullname || "Minh Anh";
  const avatar = user?.avatar || "/cat-home.jpg";

  return (
    <main className="min-h-screen overflow-x-hidden bg-[var(--background)] text-[var(--lumiverse-ink)]">
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
