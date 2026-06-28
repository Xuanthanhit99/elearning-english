"use client";

import { useSearchParams } from "next/navigation";
import ArenaRoomPage from "./ArenaRoomPage";

export default function ArenaRoomRoute() {
  const searchParams = useSearchParams();
  const roomId = searchParams.get("roomId");

  if (!roomId) {
    return (
      <main className="min-h-screen bg-[#fff4e8] p-8 font-black text-[#1f2a44]">
        Không tìm thấy mã phòng Arena.
      </main>
    );
  }

  return <ArenaRoomPage roomId={roomId} />;
}
