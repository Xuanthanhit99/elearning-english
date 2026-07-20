import ArenaRoomRoute from "@/src/Components/Arena/ArenaRoomRoute";
import { Suspense } from "react";

export default function Page() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[var(--background)] p-8 font-black text-[var(--lumiverse-ink)]">
          Dang mo phong Arena...
        </main>
      }
    >
      <ArenaRoomRoute />
    </Suspense>
  );
}
