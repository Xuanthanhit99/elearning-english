"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/*
 * MÃ n mock cÅ© Ä‘Ã£ Ä‘Æ°á»£c há»£p nháº¥t vÃ o ReadingLessonPage.
 * Giá»¯ component nÃ y Ä‘á»ƒ route cÅ© khÃ´ng bá»‹ lá»—i 404.
 */
export default function ReadingPracticePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/reading/articles");
  }, [router]);

  return (
    <div className="grid min-h-screen place-items-center bg-[#fbfbff]">
      <p className="font-bold text-slate-600">
        Äang chuyá»ƒn Ä‘áº¿n danh sÃ¡ch bÃ i Ä‘á»c...
      </p>
    </div>
  );
}
