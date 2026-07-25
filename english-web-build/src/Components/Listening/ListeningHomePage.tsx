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
  "Daily Life",
  "Travel",
  "Health",
  "Work",
  "Technology",
  "Environment",
  "Education",
  "Culture",
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
        getApiErrorMessage(requestError, "KhÃ´ng táº£i Ä‘Æ°á»£c Listening Home."),
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
        getApiErrorMessage(requestError, "KhÃ´ng báº¯t Ä‘áº§u Ä‘Æ°á»£c bÃ i luyá»‡n nghe."),
      );
    } finally {
      setStarting(false);
    }
  }

  if (loading) {
    return <PageState text="Äang táº£i Listening..." />;
  }

  if (error && !data) {
    return <PageState text={error} action={load} />;
  }

  if (!data) return null;

  const stats = [
    {
      label: "BÃ i hoÃ n thÃ nh",
      value: data.stats.completedSessions,
      icon: Trophy,
    },
    {
      label: "Äá»™ chÃ­nh xÃ¡c",
      value: `${data.stats.averageAccuracy}%`,
      icon: Target,
    },
    {
      label: "Thá»i gian nghe",
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
    <main className="min-h-screen bg-[#fbfbff] text-[#101733]">
      <div className="mx-auto min-h-screen max-w-[1920px]">
        <section className="min-w-0 px-0 py-2 sm:py-4 lg:px-2">
          <div className="mx-auto max-w-[1500px]">
            <section className="overflow-hidden rounded-3xl bg-gradient-to-r from-violet-700 to-indigo-600 p-7 text-white shadow-xl shadow-violet-200">
              <div className="grid gap-7 md:grid-cols-[1fr_340px] md:items-center">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-black">
                    <Sparkles size={15} />
                    LISTENING PATH
                  </div>

                  <h1 className="mt-4 text-3xl font-black md:text-4xl">
                    Luyá»‡n nghe má»—i ngÃ y
                  </h1>

                  <p className="mt-3 max-w-2xl text-white/75">
                    HÃ´m nay: <strong>{data.dailyRecommendation.topic}</strong> Â·{" "}
                    {data.dailyRecommendation.level} Â·{" "}
                    {data.dailyRecommendation.limit} cÃ¢u.
                  </p>

                  <div className="mt-6 flex flex-wrap gap-3">
                    {data.continueSession ? (
                      <button
                        onClick={() =>
                          router.push(
                            `/listening/practice/${data.continueSession!.sessionId}`,
                          )
                        }
                        className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 font-black text-violet-700"
                      >
                        Tiáº¿p tá»¥c bÃ i Ä‘ang há»c
                        <ArrowRight size={18} />
                      </button>
                    ) : (
                      <button
                        disabled={starting}
                        onClick={() => startPractice()}
                        className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 font-black text-violet-700 disabled:opacity-60"
                      >
                        {starting ? "Äang chuáº©n bá»‹..." : "Báº¯t Ä‘áº§u bÃ i hÃ´m nay"}
                        <Play size={18} />
                      </button>
                    )}

                    <button
                      onClick={() => router.push("/listening/history")}
                      className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-5 py-3 font-black"
                    >
                      <History size={18} />
                      Lá»‹ch sá»­
                    </button>
                  </div>
                </div>

                <div className="rounded-3xl bg-white/10 p-6 backdrop-blur">
                  <div className="flex items-center gap-4">
                    <div className="grid h-16 w-16 place-items-center rounded-2xl bg-white/15">
                      <Headphones size={34} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white/70">
                        Cáº¥p Ä‘á»™ hiá»‡n táº¡i
                      </p>
                      <p className="text-3xl font-black">
                        {data.level.current}
                      </p>
                      <p className="text-sm text-white/75">
                        {data.level.title}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center gap-3 rounded-2xl bg-white/10 p-4">
                    <Flame className="text-orange-300" />
                    <div>
                      <p className="font-black">
                        {data.streak.current} ngÃ y liÃªn tiáº¿p
                      </p>
                      <p className="text-xs text-white/65">
                        Ká»· lá»¥c {data.streak.longest} ngÃ y
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

            <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {stats.map((item) => {
                const Icon = item.icon;

                return (
                  <article
                    key={item.label}
                    className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm"
                  >
                    <div className="grid h-11 w-11 place-items-center rounded-xl bg-violet-50 text-violet-600">
                      <Icon size={22} />
                    </div>
                    <p className="mt-4 text-2xl font-black">{item.value}</p>
                    <p className="text-sm font-semibold text-slate-500">
                      {item.label}
                    </p>
                  </article>
                );
              })}
            </section>

            <div className="mt-7 grid gap-7 xl:grid-cols-[minmax(0,1fr)_370px]">
              <section className="space-y-7">
                <section className="rounded-3xl border border-violet-100 bg-white p-6 shadow-sm">
                  <h2 className="text-xl font-black">Luyá»‡n nghe theo chá»§ Ä‘á»</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Backend hiá»‡n táº¡o bÃ i theo level vÃ  topic.
                  </p>

                  <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {topics.map((topic) => (
                      <button
                        key={topic}
                        disabled={starting}
                        onClick={() =>
                          startPractice({
                            level: data.level.current,
                            topic,
                            limit: 10,
                          })
                        }
                        className="rounded-2xl bg-slate-50 p-5 text-left transition hover:bg-violet-50 disabled:opacity-50"
                      >
                        <div className="text-3xl">ðŸŽ§</div>
                        <h3 className="mt-3 font-black">{topic}</h3>
                        <p className="mt-1 text-xs font-bold text-slate-500">
                          {data.level.current} Â· 10 cÃ¢u
                        </p>
                      </button>
                    ))}
                  </div>
                </section>

                <section className="rounded-3xl border border-violet-100 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-black">Hoáº¡t Ä‘á»™ng gáº§n Ä‘Ã¢y</h2>
                    <button
                      onClick={() => router.push("/listening/history")}
                      className="font-bold text-violet-600"
                    >
                      Xem táº¥t cáº£
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
                              {session.level} Â· {session.correct}/
                              {session.total} cÃ¢u Ä‘Ãºng
                            </p>
                          </div>
                          <span className="text-xl font-black text-violet-600">
                            {session.score}%
                          </span>
                        </button>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500">
                        ChÆ°a cÃ³ bÃ i Listening Ä‘Ã£ hoÃ n thÃ nh.
                      </p>
                    )}
                  </div>
                </section>
              </section>

              <aside className="space-y-6">
                <MissionCard
                  title="Nhiá»‡m vá»¥ hÃ´m nay"
                  mission={dailyMission}
                  loading={missionLoading}
                />
                <MissionCard
                  title="Má»¥c tiÃªu tuáº§n"
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
    <section className="rounded-3xl border border-violet-100 bg-white p-6 shadow-sm">
      <h2 className="font-black">{title}</h2>

      {loading ? (
        <p className="mt-4 text-sm text-slate-500">Äang táº£i nhiá»‡m vá»¥...</p>
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
          ChÆ°a cÃ³ nhiá»‡m vá»¥ Listening.
        </p>
      )}
    </section>
  );
}

function PageState({ text, action }: { text: string; action?: () => void }) {
  return (
    <div className="grid min-h-screen place-items-center bg-[#fbfbff]">
      <div className="rounded-2xl bg-white px-8 py-6 text-center shadow-sm">
        <p className="font-bold">{text}</p>
        {action && (
          <button
            onClick={action}
            className="mt-4 rounded-xl bg-violet-600 px-5 py-2 font-bold text-white"
          >
            Táº£i láº¡i
          </button>
        )}
      </div>
    </div>
  );
}
