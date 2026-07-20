"use client";

import { ReactNode } from "react";

export default function VocabularyLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[var(--background)] text-[var(--lumiverse-ink)]">
      <div className="mx-auto flex min-h-screen max-w-[1920px]">
        {/* <VocabularySidebar /> */}
        <section className="min-w-0 flex-1">
          {/* <TopBar displayName={displayName} avatar={avatar} /> */}
          {children}
        </section>
      </div>
    </main>
  );
}
