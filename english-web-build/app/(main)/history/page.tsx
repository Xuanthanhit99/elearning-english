"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Clock, Filter, RefreshCcw } from "lucide-react";
import {
  LearningActivity,
  ProgressSkill,
  ProgressStatus,
  getProgressHistory,
} from "@/src/lib/progress-api";

const skillOptions: Array<{ label: string; value: ProgressSkill | "ALL" }> = [
  { label: "Tất cả", value: "ALL" },
  { label: "Từ vựng", value: "VOCABULARY" },
  { label: "Ngữ pháp", value: "GRAMMAR" },
  { label: "Đọc", value: "READING" },
  { label: "Nghe", value: "LISTENING" },
  { label: "Nói", value: "SPEAKING" },
  { label: "Viết", value: "WRITING" },
];

const statusOptions: Array<{ label: string; value: ProgressStatus | "ALL" }> = [
  { label: "Tất cả", value: "ALL" },
  { label: "Đang học", value: "IN_PROGRESS" },
  { label: "Hoàn thành", value: "COMPLETED" },
  { label: "Bắt đầu", value: "STARTED" },
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function durationLabel(seconds?: number | null) {
  if (!seconds) return null;
  const minutes = Math.max(1, Math.round(seconds / 60));
  return `${minutes} phút`;
}

function ActivityItem({ item }: { item: LearningActivity }) {
  return (
    <Link
      href={`/history/${encodeURIComponent(item.activityKey)}`}
      className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 transition hover:border-violet-200 hover:bg-violet-50"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
        <Clock size={19} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-black text-slate-950">{item.title}</p>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-black text-slate-500">
            {item.status}
          </span>
        </div>
        <p className="mt-1 truncate text-sm font-bold text-slate-500">
          {item.skill ?? "LEARNING_PATH"} - {formatDate(item.occurredAt)}
        </p>
        <div className="mt-2 flex flex-wrap gap-2 text-xs font-black">
          {typeof item.score === "number" && (
            <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">
              Điểm {item.score}
            </span>
          )}
          {typeof item.accuracy === "number" && (
            <span className="rounded-full bg-sky-50 px-2 py-1 text-sky-700">
              Chính xác {item.accuracy}%
            </span>
          )}
          {typeof item.xpEarned === "number" && (
            <span className="rounded-full bg-amber-50 px-2 py-1 text-amber-700">
              +{item.xpEarned} XP
            </span>
          )}
          {durationLabel(item.durationSeconds) && (
            <span className="rounded-full bg-violet-50 px-2 py-1 text-violet-700">
              {durationLabel(item.durationSeconds)}
            </span>
          )}
        </div>
      </div>
      <ArrowRight size={18} className="text-slate-300" />
    </Link>
  );
}

export default function HistoryPage() {
  const [skill, setSkill] = useState<ProgressSkill | "ALL">("ALL");
  const [status, setStatus] = useState<ProgressStatus | "ALL">("ALL");
  const [range, setRange] = useState<"7d" | "30d" | "90d">("30d");
  const [items, setItems] = useState<LearningActivity[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetList() {
    setLoading(true);
    setItems([]);
    setError(null);
  }

  async function load(nextCursor: string | null = null) {
    if (nextCursor) setLoadingMore(true);
    else {
      setLoading(true);
      setItems([]);
    }
    setError(null);
    try {
      const result = await getProgressHistory({
        skill,
        status,
        range,
        cursor: nextCursor,
        limit: 20,
      });
      setItems((current) => (nextCursor ? [...current, ...result.items] : result.items));
      setCursor(result.pagination.nextCursor);
      setHasMore(result.pagination.hasMore);
    } catch {
      setError("Không tải được lịch sử học tập. Vui lòng thử lại.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    let active = true;
    getProgressHistory({ skill, status, range, limit: 20 })
      .then((result) => {
        if (!active) return;
        setItems(result.items);
        setCursor(result.pagination.nextCursor);
        setHasMore(result.pagination.hasMore);
      })
      .catch(() => {
        if (active) setError("Không tải được lịch sử học tập. Vui lòng thử lại.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [skill, status, range]);

  return (
    <div className="space-y-6 pb-10">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-violet-100 px-3 py-1 text-sm font-black text-violet-700">
              <Filter size={16} />
              Unified history
            </div>
            <h1 className="text-3xl font-black text-slate-950 sm:text-4xl">Lịch sử học tập</h1>
            <p className="mt-2 text-sm font-bold text-slate-500">
              Tất cả hoạt động học của bạn được gom về một timeline thống nhất.
            </p>
          </div>
          <Link href="/progress" className="rounded-2xl bg-violet-600 px-5 py-3 font-black text-white">
            Xem tiến độ
          </Link>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <select
          value={skill}
          onChange={(event) => {
            resetList();
            setSkill(event.target.value as ProgressSkill | "ALL");
          }}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold text-slate-700"
          aria-label="Lọc kỹ năng"
        >
          {skillOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(event) => {
            resetList();
            setStatus(event.target.value as ProgressStatus | "ALL");
          }}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold text-slate-700"
          aria-label="Lọc trạng thái"
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          value={range}
          onChange={(event) => {
            resetList();
            setRange(event.target.value as "7d" | "30d" | "90d");
          }}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold text-slate-700"
          aria-label="Khoảng thời gian"
        >
          <option value="7d">7 ngày</option>
          <option value="30d">30 ngày</option>
          <option value="90d">90 ngày</option>
        </select>
      </section>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-3xl bg-slate-200" />
          ))}
        </div>
      ) : error ? (
        <section className="rounded-3xl border border-rose-200 bg-rose-50 p-6">
          <p className="font-black text-rose-700">{error}</p>
          <button
            type="button"
            onClick={() => load()}
            className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-5 py-3 font-black text-white"
          >
            <RefreshCcw size={18} />
            Thử lại
          </button>
        </section>
      ) : items.length ? (
        <section className="space-y-3">
          {items.map((item) => (
            <ActivityItem key={item.activityKey} item={item} />
          ))}
          {hasMore && (
            <button
              type="button"
              onClick={() => load(cursor)}
              disabled={loadingMore}
              className="w-full rounded-2xl border border-violet-200 bg-white px-5 py-3 font-black text-violet-700 disabled:opacity-60"
            >
              {loadingMore ? "Đang tải..." : "Xem thêm"}
            </button>
          )}
        </section>
      ) : (
        <section className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
          <p className="font-black text-slate-700">Chưa có hoạt động trong bộ lọc này.</p>
          <p className="mt-2 text-sm font-bold text-slate-500">Hãy học thêm một bài rồi quay lại nhé.</p>
        </section>
      )}
    </div>
  );
}
