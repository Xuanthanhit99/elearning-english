"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Clock,
  RefreshCcw,
  Sparkles,
  Star,
  Target,
} from "lucide-react";
import {
  LearningActivity,
  getProgressActivityDetail,
} from "@/src/lib/progress-api";

type ActivityDetail = {
  summary: LearningActivity;
  result: {
    score?: number | null;
    accuracy?: number | null;
    durationSeconds?: number | null;
    xpEarned?: number | null;
    startedAt?: string | null;
    completedAt?: string | null;
  };
  skillSpecific: Record<string, string | number | boolean | null>;
  action: LearningActivity["action"];
};

const skillLabels: Record<string, string> = {
  VOCABULARY: "Tá»« vá»±ng",
  GRAMMAR: "Ngá»¯ phÃ¡p",
  READING: "Äá»c",
  LISTENING: "Nghe",
  SPEAKING: "NÃ³i",
  WRITING: "Viáº¿t",
};

function formatDate(value?: string | null) {
  if (!value) return "ChÆ°a cÃ³";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function durationLabel(seconds?: number | null) {
  if (!seconds) return "ChÆ°a ghi nháº­n";
  return `${Math.max(1, Math.round(seconds / 60))} phÃºt`;
}

function MetricCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
        {icon}
      </div>
      <p className="text-2xl font-black text-slate-950">{value}</p>
      <p className="text-sm font-bold text-slate-500">{label}</p>
    </div>
  );
}

export default function HistoryDetailPage() {
  const params = useParams<{ activityId: string }>();
  const router = useRouter();
  const [data, setData] = useState<ActivityDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setData(await getProgressActivityDetail(params.activityId));
    } catch {
      setError("KhÃ´ng táº£i Ä‘Æ°á»£c chi tiáº¿t hoáº¡t Ä‘á»™ng. Vui lÃ²ng Thử lại.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    getProgressActivityDetail(params.activityId)
      .then((result) => {
        if (active) setData(result);
      })
      .catch(() => {
        if (active) setError("KhÃ´ng táº£i Ä‘Æ°á»£c chi tiáº¿t hoáº¡t Ä‘á»™ng. Vui lÃ²ng Thử lại.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [params.activityId]);

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-40 animate-pulse rounded-3xl bg-slate-200" />
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-3xl bg-slate-200" />
          ))}
        </div>
        <div className="h-72 animate-pulse rounded-3xl bg-slate-200" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <section className="rounded-3xl border border-rose-200 bg-rose-50 p-6">
        <p className="font-black text-rose-700">{error ?? "KhÃ´ng cÃ³ dá»¯ liá»‡u."}</p>
        <button
          type="button"
          onClick={load}
          className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-5 py-3 font-black text-white"
        >
          <RefreshCcw size={18} />
          Thử lại
        </button>
      </section>
    );
  }

  const activity = data.summary;
  const metadataEntries = Object.entries(data.skillSpecific ?? {}).filter(
    ([, value]) => value !== null && value !== undefined && value !== "",
  );

  return (
    <div className="space-y-6 pb-10">
      <button
        type="button"
        onClick={() => router.back()}
        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 font-black text-slate-700"
      >
        <ArrowLeft size={18} />
        Quay láº¡i
      </button>

      <section className="rounded-[2rem] bg-gradient-to-br from-violet-600 to-sky-500 p-6 text-white shadow-lg shadow-violet-100">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm font-black">
              <Sparkles size={16} />
              Chi tiáº¿t hoáº¡t Ä‘á»™ng
            </div>
            <h1 className="text-3xl font-black sm:text-4xl">{activity.title}</h1>
            <p className="mt-2 max-w-2xl text-sm font-semibold text-white/85">
              {activity.description ?? "Káº¿t quáº£ há»c táº­p Ä‘Æ°á»£c láº¥y tá»« dá»¯ liá»‡u tháº­t cá»§a phiÃªn há»c."}
            </p>
          </div>
          {data.action.href && (
            <Link
              href={data.action.href}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 font-black text-violet-700"
            >
              {data.action.label}
              <ArrowRight size={18} />
            </Link>
          )}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard
          icon={<Target size={20} />}
          label="Ká»¹ nÄƒng"
          value={activity.skill ? skillLabels[activity.skill] ?? activity.skill : "Lá»™ trÃ¬nh"}
        />
        <MetricCard
          icon={<Star size={20} />}
          label="Äiá»ƒm"
          value={typeof data.result.score === "number" ? data.result.score : "ChÆ°a cÃ³"}
        />
        <MetricCard
          icon={<BookOpen size={20} />}
          label="Äá»™ chÃ­nh xÃ¡c"
          value={typeof data.result.accuracy === "number" ? `${data.result.accuracy}%` : "KhÃ´ng Ã¡p dá»¥ng"}
        />
        <MetricCard
          icon={<Clock size={20} />}
          label="Thá»i gian"
          value={durationLabel(data.result.durationSeconds)}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">TÃ³m táº¯t</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm font-bold text-slate-500">Tráº¡ng thÃ¡i</p>
              <p className="mt-1 font-black text-slate-950">{activity.status}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm font-bold text-slate-500">XP</p>
              <p className="mt-1 font-black text-slate-950">
                {typeof data.result.xpEarned === "number" ? `+${data.result.xpEarned} XP` : "ChÆ°a ghi nháº­n"}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm font-bold text-slate-500">Báº¯t Ä‘áº§u</p>
              <p className="mt-1 font-black text-slate-950">{formatDate(data.result.startedAt)}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm font-bold text-slate-500">HoÃ n thÃ nh</p>
              <p className="mt-1 font-black text-slate-950">{formatDate(data.result.completedAt)}</p>
            </div>
          </div>
        </div>

        <aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">ThÃ´ng tin chi tiáº¿t</h2>
          {metadataEntries.length ? (
            <div className="mt-4 space-y-3">
              {metadataEntries.map(([key, value]) => (
                <div key={key} className="rounded-2xl bg-violet-50 p-3">
                  <p className="text-xs font-black uppercase text-violet-500">{key}</p>
                  <p className="mt-1 font-black text-slate-950">{String(value)}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-500">
              Hoáº¡t Ä‘á»™ng nÃ y chÆ°a cÃ³ dá»¯ liá»‡u chi tiáº¿t bá»• sung.
            </p>
          )}
        </aside>
      </section>
    </div>
  );
}
