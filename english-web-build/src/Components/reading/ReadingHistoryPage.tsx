"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
} from "lucide-react";
import { api } from "@/src/lib/axios";

type HistoryStatus = "ALL" | "COMPLETED" | "IN_PROGRESS" | "FAILED";
type TimeRange = "ALL_TIME" | "7_DAYS" | "30_DAYS";

type ReadingHistoryResponse = {
  meta: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  summary: {
    total: number;
    completed: number;
    inProgress: number;
    failed: number;
    totalTimeText: string;
    averageAccuracy: number;
  };
  weeklyTime: {
    label: string;
    minutes: number;
  }[];
  performance: {
    averageAccuracy: number;
    high: number;
    medium: number;
    low: number;
  };
  items: {
    id: string;
    articleTitle: string;
    articleSlug: string;
    thumbnail: string | null;
    categoryName: string;
    categorySlug: string;
    difficultyText: string;
    level: string;
    score: number;
    accuracy: number;
    correctAnswers: number;
    totalQuestions: number;
    status: "COMPLETED" | "IN_PROGRESS" | "FAILED";
    statusText: string;
    spentTimeText: string;
    startedAt: string;
    completedAt: string | null;
  }[];
};

const fallbackThumbnail =
  "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=500&auto=format&fit=crop";

export default function ReadingHistoryPage() {
  const router = useRouter();

  const [data, setData] = useState<ReadingHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<HistoryStatus>("ALL");
  const [timeRange, setTimeRange] = useState<TimeRange>("ALL_TIME");

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "8");

      if (status !== "ALL") params.set("status", status);
      if (timeRange !== "ALL_TIME") params.set("timeRange", timeRange);

      const res = await api.get(`/reading/history?${params.toString()}`);
      const payload = res.data?.data ?? res.data;

      setData(payload);
    } catch (err) {
      console.error(err);
      setError("Không tải được lịch sử luyện đọc.");
    } finally {
      setLoading(false);
    }
  }, [page, status, timeRange]);

  useEffect(() => {
    void Promise.resolve().then(fetchHistory);
  }, [fetchHistory]);

  const pages = useMemo(() => {
    const total = data?.meta.totalPages || 1;
    return Array.from({ length: total }, (_, index) => index + 1).slice(0, 6);
  }, [data?.meta.totalPages]);

  function resetFilter() {
    setPage(1);
    setStatus("ALL");
    setTimeRange("ALL_TIME");
  }

  if (loading && !data) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#fbfbff]">
        <div className="rounded-2xl bg-white px-8 py-6 text-center shadow-sm">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600" />
          <p className="font-bold text-slate-700">Đang tải lịch sử...</p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#fbfbff]">
        <div className="rounded-2xl bg-white px-8 py-6 text-center shadow-sm">
          <p className="mb-4 font-bold text-red-500">{error}</p>
          <button
            onClick={fetchHistory}
            className="rounded-xl bg-violet-600 px-5 py-2 text-sm font-bold text-white"
          >
            Tải lại
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-[#fbfbff] text-slate-900">
      <div className="flex">

        <main className="flex-1">

          <div className="grid grid-cols-[1fr_430px] gap-7 p-8">
            <section>
              <div className="mb-6 flex items-center gap-2 text-sm font-semibold text-slate-500">
                <button onClick={() => router.push("/reading")}>
                  Đọc hiểu
                </button>
                <ChevronRight size={16} />
                <span className="text-slate-900">History</span>
              </div>

              <div className="mb-7 flex items-end justify-between">
                <div>
                  <div className="mb-4 flex items-center gap-4">
                    <div className="grid h-14 w-14 place-items-center rounded-full bg-violet-100 text-violet-600">
                      <Clock />
                    </div>
                    <div>
                      <h1 className="text-4xl font-extrabold">
                        Lịch sử luyện đọc
                      </h1>
                      <p className="mt-2 text-slate-500">
                        Xem lại quá trình luyện đọc của bạn
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <select
                    value={timeRange}
                    onChange={(e) => {
                      setPage(1);
                      setTimeRange(e.target.value as TimeRange);
                    }}
                    className="rounded-xl border border-slate-100 bg-white px-5 py-3 text-sm font-bold outline-none"
                  >
                    <option value="ALL_TIME">Tất cả thời gian</option>
                    <option value="7_DAYS">7 ngày qua</option>
                    <option value="30_DAYS">30 ngày qua</option>
                  </select>

                  <button
                    onClick={resetFilter}
                    className="rounded-xl border border-slate-100 bg-white px-5 py-3 text-sm font-bold text-violet-600"
                  >
                    Lọc
                  </button>
                </div>
              </div>

              <div className="mb-6 flex flex-wrap gap-3">
                <FilterButton
                  active={status === "ALL"}
                  label={`Tất cả (${data.summary.total})`}
                  onClick={() => {
                    setPage(1);
                    setStatus("ALL");
                  }}
                />
                <FilterButton
                  active={status === "COMPLETED"}
                  label={`Hoàn thành (${data.summary.completed})`}
                  onClick={() => {
                    setPage(1);
                    setStatus("COMPLETED");
                  }}
                />
                <FilterButton
                  active={status === "IN_PROGRESS"}
                  label={`Đang làm dở (${data.summary.inProgress})`}
                  onClick={() => {
                    setPage(1);
                    setStatus("IN_PROGRESS");
                  }}
                />
                <FilterButton
                  active={status === "FAILED"}
                  label={`Chưa làm (${data.summary.failed})`}
                  onClick={() => {
                    setPage(1);
                    setStatus("FAILED");
                  }}
                />
              </div>

              {loading && (
                <div className="mb-4 rounded-2xl bg-white p-4 text-sm font-bold text-slate-500">
                  Đang cập nhật dữ liệu...
                </div>
              )}

              <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
                <div className="grid grid-cols-[1.8fr_0.5fr_0.8fr_0.7fr_0.8fr_40px] border-b border-slate-100 px-6 py-4 text-sm font-extrabold text-slate-500">
                  <div>Bài đọc</div>
                  <div>Cấp độ</div>
                  <div>Thời gian</div>
                  <div>Điểm số</div>
                  <div>Trạng thái</div>
                  <div />
                </div>

                {data.items.length === 0 ? (
                  <div className="p-10 text-center font-bold text-slate-500">
                    Chưa có lịch sử phù hợp.
                  </div>
                ) : (
                  data.items.map((item) => (
                    <HistoryRow
                      key={item.id}
                      item={item}
                      onClick={() =>
                        router.push(`/reading/sessions/${item.id}/result`)
                      }
                    />
                  ))
                )}
              </div>

              <div className="mt-8 flex justify-center gap-2">
                <button
                  disabled={!data.meta.hasPrevPage}
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                  className="grid h-10 w-10 place-items-center rounded-xl border border-slate-100 bg-white disabled:opacity-40"
                >
                  <ChevronLeft size={18} />
                </button>

                {pages.map((item) => (
                  <button
                    key={item}
                    onClick={() => setPage(item)}
                    className={`grid h-10 w-10 place-items-center rounded-xl text-sm font-bold ${
                      page === item
                        ? "bg-violet-600 text-white"
                        : "border border-slate-100 bg-white text-slate-600"
                    }`}
                  >
                    {item}
                  </button>
                ))}

                <button
                  disabled={!data.meta.hasNextPage}
                  onClick={() => setPage((prev) => prev + 1)}
                  className="grid h-10 w-10 place-items-center rounded-xl border border-slate-100 bg-white disabled:opacity-40"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </section>

            <aside className="space-y-6">
              <RightCard title="Thống kê lịch sử">
                <div className="space-y-5">
                  <SummaryItem
                    icon={<CheckCircle2 className="text-emerald-500" />}
                    value={String(data.summary.completed)}
                    label="Bài đã hoàn thành"
                  />
                  <SummaryItem
                    icon={<Clock className="text-orange-500" />}
                    value={String(data.summary.inProgress)}
                    label="Bài đang làm dở"
                  />
                  <SummaryItem
                    icon={<BookOpen className="text-slate-400" />}
                    value={String(data.summary.failed)}
                    label="Bài chưa hoàn thành"
                  />
                </div>

                <p className="mt-6 text-center text-sm font-bold text-slate-500">
                  Tổng cộng: {data.summary.total} bài đọc
                </p>
              </RightCard>

              <RightCard title="Thời gian luyện đọc">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-4xl font-extrabold">
                      {data.summary.totalTimeText}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Tổng thời gian
                    </p>
                  </div>

                  <select
                    value={timeRange}
                    onChange={(e) => {
                      setPage(1);
                      setTimeRange(e.target.value as TimeRange);
                    }}
                    className="rounded-xl border border-slate-100 bg-white px-4 py-2 text-sm font-bold outline-none"
                  >
                    <option value="7_DAYS">7 ngày qua</option>
                    <option value="30_DAYS">30 ngày qua</option>
                    <option value="ALL_TIME">Tất cả</option>
                  </select>
                </div>

                <div className="mt-6 flex h-32 items-end justify-between gap-3">
                  {data.weeklyTime.map((item) => {
                    const max = Math.max(
                      ...data.weeklyTime.map((x) => x.minutes),
                      1,
                    );

                    return (
                      <div
                        key={item.label}
                        className="flex flex-1 flex-col items-center gap-2"
                      >
                        <div
                          className="w-5 rounded-t-lg bg-violet-500"
                          style={{
                            height: `${Math.max((item.minutes / max) * 90, 8)}px`,
                          }}
                        />
                        <span className="text-xs font-bold text-slate-500">
                          {item.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </RightCard>

              <RightCard title="Hiệu suất">
                <div className="grid h-40 w-40 place-items-center rounded-full border-[12px] border-violet-600">
                  <div className="text-center">
                    <p className="text-4xl font-extrabold">
                      {data.performance.averageAccuracy}%
                    </p>
                    <p className="text-sm text-slate-500">Tỷ lệ trung bình</p>
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  <PerformanceItem
                    color="bg-emerald-500"
                    label="80 - 100%"
                    value={`${data.performance.high} bài`}
                  />
                  <PerformanceItem
                    color="bg-orange-500"
                    label="50 - 79%"
                    value={`${data.performance.medium} bài`}
                  />
                  <PerformanceItem
                    color="bg-red-500"
                    label="0 - 49%"
                    value={`${data.performance.low} bài`}
                  />
                </div>

                <button
                  onClick={() => router.push("/reading/articles")}
                  className="mt-6 w-full rounded-xl border border-violet-300 py-3 text-sm font-bold text-violet-600"
                >
                  Xem báo cáo chi tiết
                </button>
              </RightCard>
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}

function FilterButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl px-5 py-3 text-sm font-bold ${
        active
          ? "bg-violet-600 text-white shadow-lg shadow-violet-200"
          : "border border-slate-100 bg-white text-slate-600"
      }`}
    >
      {label}
    </button>
  );
}

function HistoryRow({
  item,
  onClick,
}: {
  item: ReadingHistoryResponse["items"][number];
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="grid w-full grid-cols-[1.8fr_0.5fr_0.8fr_0.7fr_0.8fr_40px] items-center border-b border-slate-100 px-6 py-4 text-left transition hover:bg-slate-50"
    >
      <div className="flex items-center gap-4">
        <img
          src={item.thumbnail || fallbackThumbnail}
          alt={item.articleTitle}
          className="h-20 w-28 rounded-xl object-cover"
        />
        <div>
          <h3 className="font-extrabold">{item.articleTitle}</h3>
          <div className="mt-2 flex gap-2">
            <span className="rounded-lg bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-600">
              {item.categoryName}
            </span>
            <span className="rounded-lg bg-blue-100 px-2 py-1 text-xs font-bold text-blue-600">
              {item.difficultyText}
            </span>
          </div>
        </div>
      </div>

      <div className="font-bold text-slate-700">{item.level}</div>

      <div className="text-sm font-semibold text-slate-600">
        <div>{formatDate(item.completedAt || item.startedAt)}</div>
        <div className="mt-1 text-slate-500">
          {formatTime(item.completedAt || item.startedAt)}
        </div>
      </div>

      <div>
        <p
          className={`text-lg font-extrabold ${
            item.score >= 80
              ? "text-emerald-600"
              : item.score >= 50
                ? "text-orange-500"
                : "text-red-500"
          }`}
        >
          {item.score}%
        </p>
        <p className="text-sm text-slate-500">
          {item.correctAnswers}/{item.totalQuestions} câu
        </p>
      </div>

      <div>
        <span
          className={`rounded-lg px-3 py-2 text-xs font-bold ${
            item.status === "COMPLETED"
              ? "bg-emerald-100 text-emerald-600"
              : item.status === "FAILED"
                ? "bg-red-100 text-red-500"
                : "bg-orange-100 text-orange-600"
          }`}
        >
          {item.statusText}
        </span>
      </div>

      <ChevronRight className="text-slate-400" />
    </button>
  );
}

function SummaryItem({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-4">
      <div className="grid h-14 w-14 place-items-center rounded-full bg-slate-50">
        {icon}
      </div>
      <div>
        <p className="text-2xl font-extrabold">{value}</p>
        <p className="text-sm text-slate-500">{label}</p>
      </div>
    </div>
  );
}

function PerformanceItem({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className={`h-3 w-3 rounded-full ${color}`} />
        <span className="text-sm font-bold text-slate-600">{label}</span>
      </div>
      <span className="text-sm font-bold">{value}</span>
    </div>
  );
}

function RightCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <h2 className="mb-5 text-lg font-extrabold">{title}</h2>
      {children}
    </div>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("vi-VN");
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
