"use client";

import {
  ArrowRight,
  Clock,
  Flame,
  Headphones,
  History,
  Play,
  Sparkles,
  Star,
  Target,
  Trophy,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/src/lib/axios";
import type {
  ApiEnvelope,
  ListeningHomeResponse,
  MissionItem,
} from "./listening.types";
import { getApiErrorMessage, unwrap } from "./listening.helpers";
import { useListeningMissions } from "./useListeningMissions";

const topics = [
  { value: "Daily Life", label: "Cuộc sống", icon: "☀️" },
  { value: "Travel", label: "Du lịch", icon: "✈️" },
  { value: "Health", label: "Sức khỏe", icon: "💚" },
  { value: "Work", label: "Công việc", icon: "💼" },
  { value: "Technology", label: "Công nghệ", icon: "💻" },
  { value: "Environment", label: "Môi trường", icon: "🌿" },
  { value: "Education", label: "Học tập", icon: "📚" },
  { value: "Culture", label: "Văn hóa", icon: "🌏" },
];

export default function ListeningHomePage() {
  const router = useRouter();
  const [data, setData] = useState<ListeningHomeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  const {
    dailyMission,
    weeklyMission,
    loading: missionLoading,
  } = useListeningMissions();

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get<
        ListeningHomeResponse | ApiEnvelope<ListeningHomeResponse>
      >("/listening/home");

      setData(unwrap(response.data));
    } catch (requestError) {
      setError(
        getApiErrorMessage(requestError, "Không tải được Listening Home."),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function startPractice(input?: {
    level?: string;
    topic?: string;
    limit?: number;
  }) {
    try {
      setStarting(true);
      setError("");

      const response = await api.post<
        { sessionId: string } | ApiEnvelope<{ sessionId: string }>
      >("/listening/practice/start", {
        level: input?.level ?? data?.dailyRecommendation.level ?? "B1",
        topic: input?.topic ?? data?.dailyRecommendation.topic,
        limit: input?.limit ?? data?.dailyRecommendation.limit ?? 10,
      });

      const payload = unwrap(response.data);

      router.push(`/listening/practice/${payload.sessionId}`);
    } catch (requestError) {
      setError(
        getApiErrorMessage(requestError, "Không bắt đầu được bài luyện nghe."),
      );
    } finally {
      setStarting(false);
    }
  }

  if (loading) {
    return <PageState text="Đang tải Listening..." />;
  }

  if (error && !data) {
    return <PageState text={error} action={load} />;
  }

  if (!data) return null;

  const stats = [
    {
      label: "Bài hoàn thành",
      value: data.stats.completedSessions,
      icon: Trophy,
    },
    {
      label: "Độ chính xác",
      value: `${data.stats.averageAccuracy}%`,
      icon: Target,
    },
    {
      label: "Thời gian nghe",
      value: data.stats.totalListeningTimeText,
      icon: Clock,
    },
    {
      label: "XP Listening",
      value: data.stats.totalXp,
      icon: Star,
    },
  ];

  return (
    <main className="min-h-screen bg-[#f7faff] text-[#101733]">
      <div className="mx-auto min-h-screen max-w-[1920px]">
        <section className="min-w-0 px-0 py-2 pb-24 sm:py-4 lg:px-2 lg:pb-4">
          <div className="mx-auto max-w-[1500px]">
            <section className="overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 to-sky-600 p-4 text-white shadow-lg shadow-blue-100 sm:p-7">
              <div className="grid gap-3 sm:gap-4 md:grid-cols-[1fr_300px] md:items-center">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-black sm:px-4 sm:py-2">
                    <Sparkles size={15} />
                    LỘ TRÌNH NGHE
                  </div>

                  <h1 className="mt-2 text-2xl font-black sm:mt-3 sm:text-3xl md:text-4xl">
                    Luyện nghe mỗi ngày
                  </h1>

                  <p className="mt-2 max-w-2xl text-sm text-white/75 sm:mt-3 sm:text-base">
                    Hôm nay: <strong>{data.dailyRecommendation.topic}</strong> ·{" "}
                    {data.dailyRecommendation.level} ·{" "}
                    {data.dailyRecommendation.limit} câu.
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2 sm:mt-6 sm:gap-3">
                    {data.continueSession ? (
                      <button
                        onClick={() =>
                          router.push(
                            `/listening/practice/${data.continueSession!.sessionId}`,
                          )
                        }
                        className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 font-black text-blue-700"
                      >
                        Tiếp tục bài đang học
                        <ArrowRight size={18} />
                      </button>
                    ) : (
                      <button
                        disabled={starting}
                        onClick={() => startPractice()}
                        className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 font-black text-blue-700 disabled:opacity-60"
                      >
                        {starting ? "Đang chuẩn bị..." : "Bắt đầu bài hôm nay"}
                        <Play size={18} />
                      </button>
                    )}

                    <button
                      onClick={() => router.push("/listening/history")}
                      className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-5 py-3 font-black"
                    >
                      <History size={18} />
                      Lịch sử
                    </button>
                  </div>
                </div>

                <div className="hidden grid-cols-2 gap-2 rounded-2xl bg-white/10 p-3 backdrop-blur sm:grid md:block md:p-5">
                  <div className="flex items-center gap-2 md:gap-4">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/15 md:h-14 md:w-14">
                      <Headphones size={34} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white/70">
                        Cấp độ hiện tại
                      </p>
                      <p className="text-xl font-black md:text-3xl">
                        {data.level.current}
                      </p>
                      <p className="text-sm text-white/75">
                        {data.level.title}
                      </p>
                    </div>
                  </div>

                  <div className="mt-0 flex items-center gap-2 rounded-xl bg-white/10 p-2 md:mt-4 md:gap-3 md:p-3">
                    <Flame className="text-orange-300" />
                    <div>
                      <p className="font-black">
                        {data.streak.current} ngày liên tiếp
                      </p>
                      <p className="text-xs text-white/65">
                        Kỷ lục {data.streak.longest} ngày
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {error && (
              <div className="mt-5 rounded-2xl bg-red-50 p-4 font-bold text-red-600">
                {error}
              </div>
            )}

            <section className="mt-3 grid grid-cols-2 gap-2 sm:mt-7 sm:gap-4 xl:grid-cols-4">
              {stats.map((item) => {
                const Icon = item.icon;

                return (
                  <article
                    key={item.label}
                    className="rounded-xl border border-blue-100 bg-white p-3 shadow-sm sm:rounded-2xl sm:p-5"
                  >
                    <div className="hidden h-11 w-11 place-items-center rounded-xl bg-blue-50 text-blue-600 sm:grid">
                      <Icon size={22} />
                    </div>
                    <p className="text-lg font-black sm:mt-4 sm:text-2xl">{item.value}</p>
                    <p className="text-sm font-semibold text-slate-500">
                      {item.label}
                    </p>
                  </article>
                );
              })}
            </section>

            <div className="mt-4 grid gap-5 sm:mt-7 sm:gap-7 xl:grid-cols-[minmax(0,1fr)_370px]">
              <section className="space-y-4 sm:space-y-7">
                <section className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm sm:p-6">
                  <h2 className="text-xl font-black">Luyện nghe theo chủ đề</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Chọn chủ đề gần gũi để luyện nghe theo đúng trình độ hiện tại.
                  </p>

                  <div className="mt-4 grid grid-cols-2 gap-2 sm:mt-6 sm:gap-4 lg:grid-cols-4">
                    {topics.map((topic) => (
                      <button
                        key={topic.value}
                        disabled={starting}
                        onClick={() =>
                          startPractice({
                            level: data.level.current,
                            topic: topic.value,
                            limit: 10,
                          })
                        }
                        className="rounded-xl bg-slate-50 p-3 text-left transition hover:bg-blue-50 disabled:opacity-50 sm:rounded-2xl sm:p-5"
                      >
                        <div className="text-2xl sm:text-3xl">{topic.icon}</div>
                        <h3 className="mt-2 font-black sm:mt-3">{topic.label}</h3>
                        <p className="mt-1 text-xs font-bold text-slate-500">
                          {data.level.current} · 10 câu
                        </p>
                      </button>
                    ))}
                  </div>
                </section>

                <section className="rounded-2xl border border-blue-100 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-black">Hoạt động gần đây</h2>
                    <button
                      onClick={() => router.push("/listening/history")}
                      className="font-bold text-blue-600"
                    >
                      Xem tất cả
                    </button>
                  </div>

                  <div className="mt-5 space-y-3">
                    {data.recentSessions.length ? (
                      data.recentSessions.map((session) => (
                        <button
                          key={session.id}
                          onClick={() =>
                            router.push(
                              `/listening/sessions/${session.id}/result`,
                            )
                          }
                          className="flex w-full items-center justify-between rounded-2xl bg-slate-50 p-4 text-left"
                        >
                          <div>
                            <h3 className="font-black">
                              {session.topic || "Luyện nghe"}
                            </h3>
                            <p className="mt-1 text-sm text-slate-500">
                              {session.level} · {session.correct}/
                              {session.total} câu đúng
                            </p>
                          </div>
                          <span className="text-xl font-black text-blue-600">
                            {session.score}%
                          </span>
                        </button>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500">
                        Chưa có bài Listening đã hoàn thành.
                      </p>
                    )}
                  </div>
                </section>
              </section>

              <aside className="hidden space-y-6 xl:block">
                <MissionCard
                  title="Nhiệm vụ hôm nay"
                  mission={dailyMission}
                  loading={missionLoading}
                />
                <MissionCard
                  title="Mục tiêu tuần"
                  mission={weeklyMission}
                  loading={missionLoading}
                />
              </aside>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function MissionCard({
  title,
  mission,
  loading,
}: {
  title: string;
  mission: MissionItem | null;
  loading: boolean;
}) {
  return (
    <section className="rounded-2xl border border-blue-100 bg-white p-6 shadow-sm">
      <h2 className="font-black">{title}</h2>

      {loading ? (
        <p className="mt-4 text-sm text-slate-500">Đang tải nhiệm vụ...</p>
      ) : mission ? (
        <>
          <h3 className="mt-4 font-black">{mission.title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            {mission.description}
          </p>
          <div className="mt-5 h-3 rounded-full bg-slate-100">
            <div
              className="h-3 rounded-full bg-emerald-500"
              style={{
                width: `${Math.min(mission.progressPercent, 100)}%`,
              }}
            />
          </div>
          <div className="mt-3 flex justify-between text-sm font-bold">
            <span>
              {mission.progress}/{mission.target}
            </span>
            <span className="text-orange-500">+{mission.reward.xp} XP</span>
          </div>
        </>
      ) : (
        <p className="mt-4 text-sm text-slate-500">
          Chưa có nhiệm vụ Listening.
        </p>
      )}
    </section>
  );
}

function PageState({ text, action }: { text: string; action?: () => void }) {
  return (
    <div className="grid min-h-screen place-items-center bg-[#f7faff]">
      <div className="rounded-2xl bg-white px-8 py-6 text-center shadow-sm">
        <p className="font-bold">{text}</p>
        {action && (
          <button
            onClick={action}
            className="mt-4 rounded-xl bg-blue-600 px-5 py-2 font-bold text-white"
          >
            Tải lại
          </button>
        )}
      </div>
    </div>
  );
}
