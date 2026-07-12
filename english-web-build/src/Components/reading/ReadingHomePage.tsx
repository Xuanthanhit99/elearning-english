"use client";

import {
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock,
  Flame,
  Search,
  Sparkles,
  Star,
  Target,
  Trophy,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/src/lib/axios";
import {
  ApiEnvelope,
  ReadingHomeResponse,
} from "./reading-v2.types";
import {
  missionStatusText,
  useReadingMissions,
} from "./use-reading-missions";

const fallbackThumbnail =
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=700&auto=format&fit=crop";

function unwrap<T>(value: T | ApiEnvelope<T>): T {
  return typeof value === "object" &&
    value !== null &&
    "data" in value
    ? (value as ApiEnvelope<T>).data
    : (value as T);
}

export default function ReadingHomePage() {
  const router = useRouter();
  const [data, setData] =
    useState<ReadingHomeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [keyword, setKeyword] = useState("");

  const {
    dailyMission,
    weeklyMission,
    loading: missionLoading,
  } = useReadingMissions();

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get<
        ReadingHomeResponse | ApiEnvelope<ReadingHomeResponse>
      >("/reading/home");

      setData(unwrap(response.data));
    } catch {
      setError("Không tải được trang Reading.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const continueArticle = useMemo(() => {
    if (!data) return null;

    const missionArticleId = dailyMission?.lessonId;

    if (missionArticleId) {
      const missionArticle = data.featuredArticles.find(
        (item) => item.id === missionArticleId,
      );

      if (missionArticle) return missionArticle;
    }

    return (
      data.featuredArticles.find(
        (item) => item.isStarted && !item.isCompleted,
      ) ??
      data.featuredArticles.find((item) => !item.isCompleted) ??
      data.featuredArticles[0] ??
      null
    );
  }, [data, dailyMission?.lessonId]);

  function submitSearch() {
    const value = keyword.trim();

    router.push(
      value
        ? `/reading/articles?keyword=${encodeURIComponent(value)}`
        : "/reading/articles",
    );
  }

  if (loading) {
    return <PageState text="Đang tải Reading..." />;
  }

  if (error || !data) {
    return (
      <PageState
        text={error || "Không có dữ liệu Reading."}
        action={load}
      />
    );
  }

  const stats = [
    {
      label: "Bài hoàn thành",
      value: data.stats.completedArticles,
      icon: CheckCircle2,
    },
    {
      label: "Độ chính xác",
      value: `${data.stats.averageAccuracy}%`,
      icon: Target,
    },
    {
      label: "Thời gian đọc",
      value: data.stats.totalReadingTimeText,
      icon: Clock,
    },
    {
      label: "XP Reading",
      value: data.stats.totalXp,
      icon: Star,
    },
  ];

  return (
    <main className="min-h-screen bg-[#fbfbff] px-5 py-6 text-slate-900 lg:px-10">
      <header className="mx-auto flex max-w-[1500px] flex-col gap-4 rounded-2xl border border-violet-100 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            submitSearch();
          }}
          className="relative w-full md:max-w-[620px]"
        >
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            size={19}
          />
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="Tìm bài đọc hoặc chủ đề..."
            className="h-12 w-full rounded-xl bg-slate-50 pl-12 pr-24 text-sm outline-none focus:ring-2 focus:ring-violet-200"
          />
          <button className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-bold text-white">
            Tìm
          </button>
        </form>

        <div className="flex items-center gap-5 text-sm font-bold">
          <span className="flex items-center gap-2">
            <Flame className="text-orange-500" size={18} />
            {data.streak.currentStreak} ngày
          </span>
          <span className="flex items-center gap-2">
            <Trophy className="text-violet-600" size={18} />
            {data.currentLevel.title}
          </span>
        </div>
      </header>

      <div className="mx-auto mt-7 grid max-w-[1500px] gap-7 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="min-w-0 space-y-7">
          <section className="overflow-hidden rounded-3xl bg-gradient-to-r from-violet-700 to-indigo-600 p-7 text-white shadow-xl shadow-violet-200">
            <div className="grid gap-6 md:grid-cols-[1fr_320px] md:items-center">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-black">
                  <Sparkles size={15} />
                  AI LEARNING PATH
                </div>
                <h1 className="text-3xl font-black md:text-4xl">
                  Tiếp tục luyện đọc hôm nay
                </h1>
                <p className="mt-3 max-w-2xl text-white/80">
                  Hoàn thành bài đọc, quiz và thời gian học để
                  cập nhật nhiệm vụ tự động.
                </p>

                <button
                  type="button"
                  disabled={!continueArticle}
                  onClick={() =>
                    continueArticle &&
                    router.push(
                      `/reading/articles/${continueArticle.slug}`,
                    )
                  }
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 font-black text-violet-700 disabled:opacity-50"
                >
                  {continueArticle?.isStarted
                    ? "Tiếp tục bài đang đọc"
                    : "Bắt đầu bài được đề xuất"}
                  <ChevronRight size={18} />
                </button>
              </div>

              {continueArticle && (
                <article className="rounded-2xl bg-white/10 p-4 backdrop-blur">
                  <img
                    src={
                      continueArticle.thumbnail || fallbackThumbnail
                    }
                    alt={continueArticle.title}
                    className="h-36 w-full rounded-xl object-cover"
                  />
                  <p className="mt-3 text-xs font-bold text-white/70">
                    {continueArticle.categoryName} ·{" "}
                    {continueArticle.difficultyText}
                  </p>
                  <h2 className="mt-1 font-black">
                    {continueArticle.title}
                  </h2>
                </article>
              )}
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((item) => {
              const Icon = item.icon;

              return (
                <article
                  key={item.label}
                  className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-center gap-4">
                    <div className="grid h-12 w-12 place-items-center rounded-xl bg-violet-50 text-violet-600">
                      <Icon size={23} />
                    </div>
                    <div>
                      <p className="text-2xl font-black">
                        {item.value}
                      </p>
                      <p className="text-sm font-semibold text-slate-500">
                        {item.label}
                      </p>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>

          <section className="rounded-3xl border border-violet-100 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black">
                  Bài đọc nổi bật
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Danh sách từ API Reading hiện tại.
                </p>
              </div>
              <button
                onClick={() => router.push("/reading/articles")}
                className="font-bold text-violet-600"
              >
                Xem tất cả
              </button>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {data.featuredArticles.map((article) => (
                <button
                  key={article.id}
                  onClick={() =>
                    router.push(`/reading/articles/${article.slug}`)
                  }
                  className="overflow-hidden rounded-2xl border border-slate-100 text-left transition hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <img
                    src={article.thumbnail || fallbackThumbnail}
                    alt={article.title}
                    className="h-40 w-full object-cover"
                  />
                  <div className="p-4">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-emerald-600">
                        {article.categoryName}
                      </span>
                      <span className="text-orange-500">
                        +{article.xpReward} XP
                      </span>
                    </div>
                    <h3 className="mt-2 line-clamp-2 font-black">
                      {article.title}
                    </h3>
                    <p className="mt-2 text-sm text-slate-500">
                      {article.readTimeText} · {article.questionCount} câu
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-violet-100 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-black">
                Chủ đề Reading
              </h2>
              <button
                onClick={() => router.push("/reading/categories")}
                className="font-bold text-violet-600"
              >
                Xem tất cả
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {data.categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() =>
                    router.push(
                      `/reading/categories/${category.slug}`,
                    )
                  }
                  className="flex items-center gap-4 rounded-2xl bg-slate-50 p-4 text-left transition hover:bg-violet-50"
                >
                  <div className="grid h-12 w-12 place-items-center rounded-xl bg-white text-violet-600 shadow-sm">
                    <BookOpen size={22} />
                  </div>
                  <div>
                    <h3 className="font-black">{category.name}</h3>
                    <p className="text-sm text-slate-500">
                      {category.articleCount} bài ·{" "}
                      {category.difficultyText}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        </section>

        <aside className="space-y-6">
          <MissionCard
            title="Nhiệm vụ Reading hôm nay"
            loading={missionLoading}
            mission={dailyMission}
          />

          <MissionCard
            title="Mục tiêu Reading tuần"
            loading={missionLoading}
            mission={weeklyMission}
          />

          <section className="rounded-3xl border border-violet-100 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-black">
              Tiến độ tổng thể
            </h2>
            <div className="mt-5 h-3 rounded-full bg-slate-100">
              <div
                className="h-3 rounded-full bg-violet-600"
                style={{
                  width: `${Math.min(data.progress.percent, 100)}%`,
                }}
              />
            </div>
            <p className="mt-3 text-sm font-bold text-slate-600">
              {data.progress.completedArticles}/
              {data.progress.totalArticles} bài hoàn thành
            </p>
          </section>
        </aside>
      </div>
    </main>
  );
}

function MissionCard({
  title,
  loading,
  mission,
}: {
  title: string;
  loading: boolean;
  mission: ReturnType<typeof useReadingMissions>["dailyMission"];
}) {
  return (
    <section className="rounded-3xl border border-violet-100 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-violet-50 text-violet-600">
          <Target size={22} />
        </div>
        <h2 className="font-black">{title}</h2>
      </div>

      {loading ? (
        <p className="mt-5 text-sm text-slate-500">
          Đang tải nhiệm vụ...
        </p>
      ) : mission ? (
        <>
          <h3 className="mt-5 font-black">{mission.title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            {mission.description}
          </p>
          <div className="mt-5 h-3 rounded-full bg-slate-100">
            <div
              className="h-3 rounded-full bg-emerald-500"
              style={{
                width: `${Math.min(
                  mission.progressPercent,
                  100,
                )}%`,
              }}
            />
          </div>
          <div className="mt-3 flex items-center justify-between text-sm font-bold">
            <span>{missionStatusText(mission)}</span>
            <span className="text-orange-500">
              +{mission.reward.xp} XP
            </span>
          </div>
        </>
      ) : (
        <p className="mt-5 text-sm text-slate-500">
          Chưa có nhiệm vụ Reading trong kỳ hiện tại.
        </p>
      )}
    </section>
  );
}

function PageState({
  text,
  action,
}: {
  text: string;
  action?: () => void;
}) {
  return (
    <div className="grid min-h-screen place-items-center bg-[#fbfbff]">
      <div className="rounded-2xl bg-white px-8 py-6 text-center shadow-sm">
        <p className="font-bold text-slate-700">{text}</p>
        {action && (
          <button
            onClick={action}
            className="mt-4 rounded-xl bg-violet-600 px-5 py-2 font-bold text-white"
          >
            Tải lại
          </button>
        )}
      </div>
    </div>
  );
}
