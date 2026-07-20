"use client";

import { useSearchParams } from "next/navigation";
import ArenaRoomPage from "./ArenaRoomPage";

export default function ArenaRoomRoute() {
  const searchParams = useSearchParams();
  const roomId = searchParams.get("roomId");

  if (!roomId) {
    return (
      <main className="min-h-screen bg-[var(--background)] p-8 font-black text-[var(--lumiverse-ink)]">
        Không tìm thấy mã phòng Arena.
      </main>
    );
  }

  return <ArenaRoomPage roomId={roomId} />;
}
