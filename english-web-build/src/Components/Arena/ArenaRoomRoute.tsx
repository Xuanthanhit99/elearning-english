"use client";

import { useSearchParams } from "next/navigation";
import ArenaRoomPage from "./ArenaRoomPage";

export default function ArenaRoomRoute() {
  const searchParams = useSearchParams();
  const roomId = searchParams.get("roomId");

  if (!roomId) {
    return (
      <main className="min-h-screen bg-[var(--background)] p-8 font-black text-[var(--BeaconVie-ink)]">
        KhÃ´ng tÃ¬m tháº¥y mÃ£ phÃ²ng Arena.
      </main>
    );
  }

  return <ArenaRoomPage roomId={roomId} />;
}
