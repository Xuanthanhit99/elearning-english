import ArenaRoomRoute from "@/src/Components/Arena/ArenaRoomRoute";
import { Suspense } from "react";

export default function Page() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#fff4e8] p-8 font-black text-[#1f2a44]">Đang mở phòng Arena...</main>}>
      <ArenaRoomRoute />
    </Suspense>
  );
}
