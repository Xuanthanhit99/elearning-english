"use client";

import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Headphones,
  Star,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/src/lib/axios";
import type {
  ApiEnvelope,
  ListeningHistoryResponse,
} from "./listening.types";
import {
  getApiErrorMessage,
  unwrap,
} from "./listening.helpers";

export default function ListeningHistoryPage() {
  const router = useRouter();
  const [data, setData] =
    useState<ListeningHistoryResponse | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get<
        | ListeningHistoryResponse
        | ApiEnvelope<ListeningHistoryResponse>
      >(`/listening/history?page=${page}&limit=10`);

      setData(unwrap(response.data));
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "Không tải được lịch sử Listening.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <main className="min-h-screen bg-[#fbfbff] text-[#101733]">
      <div className="mx-auto min-h-screen max-w-[1920px]">
        <section className="min-w-0 px-0 py-2 sm:py-4 lg:px-2">
          <div className="mx-auto max-w-[1300px]">
            <button
              onClick={() => router.push("/listening")}
              className="inline-flex items-center gap-2 font-bold text-violet-600"
            >
              <ChevronLeft size={18} />
              Listening Home
            </button>

            <div className="mt-5">
              <h1 className="text-3xl font-black">
                Lịch sử luyện nghe
              </h1>
              <p className="mt-2 text-slate-500">
                Xem lại điểm số, XP và kết quả từng phiên.
              </p>
            </div>

            {error && (
              <div className="mt-5 rounded-2xl bg-red-50 p-4 font-bold text-red-600">
                {error}
              </div>
            )}

            <section className="mt-7 rounded-3xl border border-violet-100 bg-white p-6 shadow-sm">
              {loading && !data ? (
                <p className="text-center font-bold text-slate-500">
                  Đang tải lịch sử...
                </p>
              ) : data?.items.length ? (
                <div className="space-y-4">
                  {data.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() =>
                        router.push(
                          `/listening/sessions/${item.id}/result`,
                        )
                      }
                      className="flex w-full flex-col gap-4 rounded-2xl bg-slate-50 p-5 text-left md:flex-row md:items-center"
                    >
                      <div className="grid h-12 w-12 place-items-center rounded-xl bg-violet-100 text-violet-600">
                        <Headphones size={23} />
                      </div>

                      <div className="flex-1">
                        <h2 className="font-black">
                          {item.topic || "Listening"}
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                          {item.level} · {item.correct}/
                          {item.total} đúng · {item.skipped} bỏ qua
                        </p>
                      </div>

                      <div className="flex gap-6">
                        <div>
                          <p className="text-xs font-bold text-slate-400">
                            Điểm
                          </p>
                          <p className="text-xl font-black text-violet-600">
                            {item.score}%
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-400">
                            XP
                          </p>
                          <p className="flex items-center gap-1 font-black text-orange-500">
                            <Star size={16} />
                            {item.xpEarned}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-400">
                            Hoàn thành
                          </p>
                          <p className="flex items-center gap-1 text-sm font-bold">
                            <Clock size={15} />
                            {item.completedAt
                              ? new Date(
                                  item.completedAt,
                                ).toLocaleDateString(
                                  "vi-VN",
                                )
                              : "-"}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-center font-bold text-slate-500">
                  Chưa có lịch sử Listening.
                </p>
              )}

              {data && (
                <div className="mt-7 flex items-center justify-center gap-4">
                  <button
                    disabled={!data.meta.hasPrevPage}
                    onClick={() =>
                      setPage((value) =>
                        Math.max(1, value - 1),
                      )
                    }
                    className="rounded-xl border p-3 disabled:opacity-40"
                  >
                    <ChevronLeft size={18} />
                  </button>

                  <span className="font-black">
                    {data.meta.page}/
                    {data.meta.totalPages}
                  </span>

                  <button
                    disabled={!data.meta.hasNextPage}
                    onClick={() =>
                      setPage((value) => value + 1)
                    }
                    className="rounded-xl border p-3 disabled:opacity-40"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              )}
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
