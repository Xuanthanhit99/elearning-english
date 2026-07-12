"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/*
 * Màn mock cũ đã được hợp nhất vào ReadingLessonPage.
 * Giữ component này để route cũ không bị lỗi 404.
 */
export default function ReadingPracticePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/reading/articles");
  }, [router]);

  return (
    <div className="grid min-h-screen place-items-center bg-[#fbfbff]">
      <p className="font-bold text-slate-600">
        Đang chuyển đến danh sách bài đọc...
      </p>
    </div>
  );
}
