"use client";

import {
  ChevronLeft,
  FileText,
  Headphones,
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function DictationPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-[#fbfbff] text-[#101733]">
      <div className="mx-auto min-h-screen max-w-[1920px]">
        <section className="min-w-0 px-0 py-2 sm:py-4 lg:px-2">
          <div className="mx-auto max-w-[1000px]">
            <button
              onClick={() => router.push("/listening")}
              className="inline-flex items-center gap-2 font-bold text-violet-600"
            >
              <ChevronLeft size={18} />
              Listening Home
            </button>

            <section className="mt-7 rounded-3xl border border-violet-100 bg-white p-8 text-center shadow-sm">
              <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-violet-100 text-violet-600">
                <FileText size={38} />
              </div>

              <h1 className="mt-5 text-3xl font-black">
                Nghe chÃ©p chÃ­nh táº£
              </h1>

              <p className="mx-auto mt-3 max-w-2xl leading-7 text-slate-500">
                Backend Listening hiá»‡n táº¡i chá»‰ há»— trá»£ cÃ¢u há»i
                tráº¯c nghiá»‡m A/B/C/D. MÃ n dictation cÅ© dÃ¹ng textarea
                vÃ  chÆ°a cÃ³ API cháº¥m ná»™i dung vÄƒn báº£n, nÃªn khÃ´ng nÃªn
                giáº£ láº­p gá»i endpoint answer hiá»‡n táº¡i.
              </p>

              <div className="mx-auto mt-6 max-w-2xl rounded-2xl bg-amber-50 p-5 text-left text-sm leading-7 text-amber-800">
                Äá»ƒ má»Ÿ chá»©c nÄƒng nÃ y, backend cáº§n thÃªm
                <code className="mx-1 rounded bg-white px-2 py-1">
                  POST /listening/dictation/:sessionId/answer
                </code>
                vá»›i transcript chuáº©n hÃ³a, similarity score vÃ  word
                diff.
              </div>

              <button
                onClick={() =>
                  router.push("/listening/topics")
                }
                className="mt-7 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-3 font-black text-white"
              >
                <Headphones size={18} />
                Luyá»‡n nghe tráº¯c nghiá»‡m
              </button>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
