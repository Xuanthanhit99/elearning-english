// app/grammar/[...slug]/page.tsx
"use client";

import { api } from "@/src/lib/axios";
import {
  BookOpen,
  Star,
  Clock,
  Bookmark,
  CheckCircle2,
  Lock,
  ChevronRight,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { ReactNode, useEffect, useMemo, useState } from "react";

type PageProps = {
  params?: {
    slug?: string[];
    topicId?: string;
  };
  slug?: string[] | string;
};

export type GrammarTopicDetailResponse = {
  id: string;
  title: string;
  description: string | null;
  level: GrammarLevel;
  category: GrammarCategory;
  overview: GrammarOverview;
  mainUsages: GrammarMainUsage[];
  lessons: GrammarLesson[];
  roadmap: GrammarRoadmapItem[];
  relatedTopics: GrammarRelatedTopic[];
};

export type GrammarLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export interface GrammarCategory {
  id: string;
  title: string;
  icon: string | null;
  color: string | null;
}

export interface GrammarOverview {
  image?: string | null;
  estimatedTime: string;
  rewardXp: number;
  rewardCoin: number;
  progress: number;
  completedLessons: number;
  totalLessons: number;
  completedQuestions: number;
  totalQuestions: number;
  averageScore?: number;
  currentLessonId: string | null;
}

export interface GrammarMainUsage {
  title: string;
  example: string;
  meaning: string;
  color: string;
}

export interface GrammarLesson {
  id: string;
  title: string;
  order: number;
  duration: string;
  type: "Lý thuyết" | "Bài tập";
  completed: boolean;
  score: number;
  locked: boolean;
  status: LessonStatus;
}

export type LessonStatus =
  "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "LOCKED";

export interface GrammarRoadmapItem {
  id: string;
  title: string;
  current: boolean;
  completed: boolean;
  locked: boolean;
  progress: number;
}

export interface GrammarRelatedTopic {
  id: string;
  title: string;
  level: GrammarLevel;
  progress: number;
}

export default function GrammarDetailPage(props: PageProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [detailGrammar, setDetailGrammar] =
    useState<GrammarTopicDetailResponse | null>(null);

  const topicId = useMemo(() => {
    const rawSlug = props.params?.topicId ?? props.params?.slug ?? props.slug;
    if (Array.isArray(rawSlug)) return rawSlug[rawSlug.length - 1];
    return rawSlug;
  }, [props.params?.slug, props.params?.topicId, props.slug]);

  useEffect(() => {
    if (!topicId) {
      setMessage("Không tìm thấy topicId trên URL.");
      setLoading(false);
      return;
    }

    let active = true;

    async function load() {
      try {
        setLoading(true);
        setMessage("");

        const res = await api.get<GrammarTopicDetailResponse>(
          `/grammar/topics/${topicId}/detail`,
        );

        if (active) setDetailGrammar(res.data);
      } catch (error) {
        if (active) setMessage("Chưa tải được dữ liệu ngữ pháp.");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [topicId]);

  const handleContinue = () => {
    const lessonId = detailGrammar?.overview.currentLessonId;
    if (!lessonId) return;
    router.push(`/grammar/lesson/${lessonId}`);
  };

  const handleOpenLesson = (lesson: GrammarLesson) => {
    if (lesson.locked) return;
    router.push(`/grammar/lesson/${lesson.id}`);
  };

  return (
    <div className="min-h-screen bg-[#fbfbff] text-[#10164f]">
      <div className="flex">

        <main className="flex-1">

          <div className="grid grid-cols-[1fr_430px] gap-8 p-6">
            {loading && <LoadingState />}

            {!loading && message && (
              <div className="col-span-2 rounded-2xl border bg-white p-8 text-center">
                <p className="font-bold text-red-500">{message}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-4 rounded-xl bg-violet-600 px-5 py-3 font-bold text-white"
                >
                  Tải lại
                </button>
              </div>
            )}

            {!loading && !message && detailGrammar && (
              <>
                <section>
                  <div className="mb-6 text-sm text-slate-500">
                    Trang chủ &gt; Ngữ pháp &gt; {detailGrammar.category.title}{" "}
                    &gt; <b className="text-[#10164f]">{detailGrammar.title}</b>
                  </div>

                  <div className="mb-6 flex items-start justify-between">
                    <div>
                      <h2 className="flex items-center gap-3 text-4xl font-black">
                        {detailGrammar.title}
                        <Star size={22} className="text-orange-400" />
                      </h2>
                      <p className="mt-3 text-slate-500">
                        {detailGrammar.description ||
                          "Chưa có mô tả cho chủ đề này."}
                      </p>

                      <div className="mt-6 flex flex-wrap gap-4">
                        <Badge>🌐 {detailGrammar.level}</Badge>
                        <Badge>🕒 {detailGrammar.overview.estimatedTime}</Badge>
                        <Badge>⭐ +{detailGrammar.overview.rewardXp}</Badge>
                        <Badge green>
                          {detailGrammar.overview.completedLessons}/
                          {detailGrammar.overview.totalLessons}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-end gap-5">
                      <div className="rounded-2xl bg-indigo-50 px-5 py-4 text-sm font-bold">
                        Giữ vững nhịp học nhé!
                        <p className="font-normal text-slate-500">
                          Bạn đang làm rất tốt! 💜
                        </p>
                      </div>
                      <div className="text-7xl">🦊</div>
                      <button className="rounded-xl border bg-white p-3">
                        <Bookmark size={20} />
                      </button>
                      <button
                        onClick={handleContinue}
                        disabled={!detailGrammar.overview.currentLessonId}
                        className="rounded-xl bg-violet-600 px-8 py-4 font-bold text-white shadow-lg shadow-violet-200 disabled:cursor-not-allowed disabled:bg-slate-300"
                      >
                        Tiếp tục học
                      </button>
                    </div>
                  </div>

                  <div className="mb-6 flex gap-8 border-b">
                    {[
                      "Tổng quan",
                      `Bài học (${detailGrammar.lessons.length})`,
                      "Bài tập",
                      "Mẹo ghi nhớ",
                      "Thảo luận",
                    ].map((x, i) => (
                      <button
                        key={x}
                        className={`pb-4 font-bold ${
                          i === 0
                            ? "border-b-2 border-violet-600 text-violet-600"
                            : "text-slate-500"
                        }`}
                      >
                        {x}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-[1.5fr_1fr] gap-5">
                    <div className="overflow-hidden rounded-2xl border bg-white">
                      <div className="grid grid-cols-2">
                        <div className="grid h-[370px] place-items-center bg-gradient-to-br from-violet-500 to-violet-300 text-white">
                          <div className="text-center">
                            <h3 className="text-4xl font-black">
                              {detailGrammar.title}
                            </h3>
                            <div className="mt-8 text-8xl">⏰</div>
                          </div>
                        </div>

                        <div className="space-y-5 p-7 text-sm">
                          <Info
                            label="Chủ đề"
                            value={detailGrammar.category.title}
                          />
                          <Info label="Cấp độ" value={detailGrammar.level} />
                          <Info
                            label="Số bài học"
                            value={`${detailGrammar.overview.totalLessons} bài học`}
                          />
                          <Info
                            label="Tiến độ của bạn"
                            value={`${detailGrammar.overview.progress}%`}
                            progress
                            percent={detailGrammar.overview.progress}
                          />
                          <Info
                            label="Hoàn thành"
                            value={`${detailGrammar.overview.completedLessons}/${detailGrammar.overview.totalLessons} bài học`}
                          />
                          <Info
                            label="Ước tính thời gian"
                            value={detailGrammar.overview.estimatedTime}
                          />
                          <Info
                            label="Phần thưởng"
                            value={`+${detailGrammar.overview.rewardXp} XP  +${detailGrammar.overview.rewardCoin} Xu`}
                          />
                        </div>
                      </div>

                      <p className="p-5 text-sm leading-6 text-slate-500">
                        {detailGrammar.description ||
                          "Nội dung tổng quan đang được cập nhật."}
                      </p>
                    </div>

                    <div className="rounded-2xl border bg-white p-6">
                      <h3 className="mb-5 font-black">Cách dùng chính</h3>

                      {detailGrammar.mainUsages.length > 0 ? (
                        detailGrammar.mainUsages.map((item) => (
                          <UseCase
                            key={`${item.title}-${item.example}`}
                            color={item.color}
                            title={item.title}
                            text={item.example}
                            meaning={item.meaning}
                          />
                        ))
                      ) : (
                        <p className="text-sm text-slate-500">
                          Chưa có dữ liệu cách dùng chính.
                        </p>
                      )}

                      <button className="mt-4 w-full rounded-xl border py-3 font-bold text-violet-600">
                        Xem thêm ví dụ
                      </button>
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl border bg-white">
                    <h3 className="border-b p-5 font-black">
                      Bài học trong chủ đề
                    </h3>

                    {detailGrammar.lessons.length > 0 ? (
                      detailGrammar.lessons.map((lesson) => {
                        const isCurrent = lesson.status === "IN_PROGRESS";

                        return (
                          <div
                            key={lesson.id}
                            className="grid grid-cols-[50px_1fr_120px_160px_120px] items-center border-b px-5 py-4 text-sm"
                          >
                            <div
                              className={`grid h-7 w-7 place-items-center rounded-full font-bold ${
                                lesson.completed
                                  ? "bg-emerald-500 text-white"
                                  : isCurrent
                                    ? "bg-violet-600 text-white"
                                    : "bg-slate-300 text-white"
                              }`}
                            >
                              {lesson.completed ? (
                                <CheckCircle2 size={17} />
                              ) : (
                                lesson.order
                              )}
                            </div>

                            <div className="font-bold">{lesson.title}</div>

                            <span
                              className={`w-fit rounded-lg px-3 py-1 text-xs font-bold ${
                                lesson.type === "Bài tập"
                                  ? "bg-pink-100 text-pink-500"
                                  : "bg-blue-100 text-blue-500"
                              }`}
                            >
                              {lesson.type}
                            </span>

                            <div className="flex items-center gap-2 text-slate-500">
                              <Clock size={15} /> {lesson.duration}
                            </div>

                            <div className="text-right">
                              {lesson.completed && (
                                <span className="font-bold text-emerald-500">
                                  Hoàn thành
                                </span>
                              )}

                              {!lesson.completed && !lesson.locked && (
                                <button
                                  onClick={() => handleOpenLesson(lesson)}
                                  className="rounded-xl bg-violet-600 px-5 py-2 font-bold text-white"
                                >
                                  {isCurrent ? "Tiếp tục" : "Bắt đầu"}
                                </button>
                              )}

                              {lesson.locked && (
                                <Lock
                                  size={18}
                                  className="ml-auto text-slate-400"
                                />
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="p-5 text-sm text-slate-500">
                        Chủ đề này chưa có bài học.
                      </p>
                    )}

                    <button className="m-4 w-[calc(100%-32px)] rounded-xl border py-3 font-bold">
                      Xem tất cả bài học
                    </button>
                  </div>
                </section>

                <aside className="space-y-6">
                  <RightCard title="Tiến độ chủ đề">
                    <div className="flex items-center gap-8">
                      <div className="grid h-36 w-36 place-items-center rounded-full border-[12px] border-violet-600">
                        <div className="text-center">
                          <p className="text-3xl font-black">
                            {detailGrammar.overview.progress}%
                          </p>
                          <p className="text-xs text-slate-500">Hoàn thành</p>
                        </div>
                      </div>

                      <div className="space-y-4 text-sm">
                        <ProgressLine
                          icon="✅"
                          main={`${detailGrammar.overview.completedLessons}/${detailGrammar.overview.totalLessons}`}
                          sub="Bài học hoàn thành"
                        />
                        <ProgressLine
                          icon="✅"
                          main={`${detailGrammar.overview.completedQuestions}/${detailGrammar.overview.totalQuestions}`}
                          sub="Bài tập hoàn thành"
                        />
                        <ProgressLine
                          icon="⭐"
                          main={`+${detailGrammar.overview.rewardXp} XP`}
                          sub="Điểm có thể nhận"
                        />
                        <ProgressLine
                          icon="💰"
                          main={`+${detailGrammar.overview.rewardCoin} Xu`}
                          sub="Phần thưởng"
                        />
                      </div>
                    </div>
                  </RightCard>

                  <RightCard title="Lộ trình ngữ pháp" action="Xem tất cả">
                    {detailGrammar.roadmap.length > 0 ? (
                      detailGrammar.roadmap.map((item) => (
                        <Roadmap
                          key={item.id}
                          title={item.title}
                          sub={
                            item.completed
                              ? "Hoàn thành"
                              : item.current
                                ? "Đang học"
                                : item.locked
                                  ? "Chưa mở khóa"
                                  : `${item.progress}% hoàn thành`
                          }
                          done={item.completed}
                          current={item.current}
                          locked={item.locked}
                        />
                      ))
                    ) : (
                      <p className="text-sm text-slate-500">Chưa có roadmap.</p>
                    )}

                    <button className="mt-5 w-full rounded-xl border py-3 font-bold text-violet-600">
                      Xem roadmap đầy đủ
                    </button>
                  </RightCard>

                  <RightCard title="Chủ đề liên quan" action="Xem tất cả">
                    {detailGrammar.relatedTopics.length > 0 ? (
                      detailGrammar.relatedTopics.map((item) => (
                        <Related
                          key={item.id}
                          title={item.title}
                          percent={`${item.progress}%`}
                          onClick={() => router.push(`/grammar/topic/${item.id}`)}
                        />
                      ))
                    ) : (
                      <p className="text-sm text-slate-500">
                        Chưa có chủ đề liên quan.
                      </p>
                    )}
                  </RightCard>
                </aside>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="col-span-2 space-y-6">
      <div className="h-10 w-80 animate-pulse rounded-xl bg-slate-200" />
      <div className="grid grid-cols-[1fr_430px] gap-8">
        <div className="h-[520px] animate-pulse rounded-2xl bg-slate-200" />
        <div className="h-[520px] animate-pulse rounded-2xl bg-slate-200" />
      </div>
    </div>
  );
}

function Badge({ children, green }: { children: ReactNode; green?: boolean }) {
  return (
    <div
      className={`rounded-xl border px-4 py-3 text-sm font-bold ${
        green ? "bg-emerald-50 text-emerald-600" : "bg-white"
      }`}
    >
      {children}
    </div>
  );
}

function Info({
  label,
  value,
  progress,
  percent = 0,
}: {
  label: string;
  value?: ReactNode;
  progress?: boolean;
  percent?: number;
}) {
  const safePercent = Math.max(0, Math.min(100, percent));

  return (
    <div className="grid grid-cols-[1fr_1fr] items-center gap-3">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium">
        {progress ? (
          <div className="flex items-center gap-3">
            <div className="h-2 w-20 rounded-full bg-slate-200">
              <div
                className="h-2 rounded-full bg-violet-600"
                style={{ width: `${safePercent}%` }}
              />
            </div>
            {value}
          </div>
        ) : (
          value
        )}
      </span>
    </div>
  );
}

function UseCase({
  title,
  text,
  meaning,
  color,
}: {
  title: string;
  text: string;
  meaning?: string;
  color: string;
}) {
  const colors: Record<string, string> = {
    green: "text-emerald-500",
    blue: "text-blue-500",
    orange: "text-orange-500",
    pink: "text-pink-500",
    purple: "text-violet-500",
  };

  return (
    <div className="mb-5">
      <p className={`font-bold ${colors[color] ?? "text-violet-500"}`}>
        ● {title}
      </p>
      <p className="ml-5 mt-2 text-sm font-bold">{text}</p>
      <p className="ml-5 text-sm text-slate-500">
        {meaning || "(Ví dụ minh họa.)"}
      </p>
    </div>
  );
}

function RightCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border bg-white p-6">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-lg font-black">{title}</h3>
        {action && (
          <button className="text-sm font-bold text-violet-600">
            {action}
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function ProgressLine({
  icon,
  main,
  sub,
}: {
  icon: string;
  main: string;
  sub: string;
}) {
  return (
    <div>
      <p className="font-black">
        {icon} {main}
      </p>
      <p className="text-xs text-slate-500">{sub}</p>
    </div>
  );
}

function Roadmap({
  title,
  sub,
  done,
  current,
  locked,
}: {
  title: string;
  sub: string;
  done?: boolean;
  current?: boolean;
  locked?: boolean;
}) {
  return (
    <div className="mb-5 flex gap-4">
      <div
        className={`mt-1 grid h-6 w-6 place-items-center rounded-full text-xs text-white ${
          done ? "bg-emerald-500" : current ? "bg-violet-600" : "bg-slate-300"
        }`}
      >
        {locked ? <Lock size={13} /> : done ? "✓" : "●"}
      </div>
      <div>
        <p className={`font-bold ${current ? "text-violet-600" : ""}`}>
          {title}
        </p>
        <p className="text-sm text-slate-500">{sub}</p>
      </div>
    </div>
  );
}

function Related({
  title,
  percent,
  onClick,
}: {
  title: string;
  percent: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="mb-5 flex w-full items-center gap-4 text-left"
    >
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-violet-100 text-violet-600">
        <BookOpen size={18} />
      </div>
      <div className="flex-1">
        <div className="mb-2 flex justify-between text-sm font-bold">
          <span>{title}</span>
          <span>{percent}</span>
        </div>
        <div className="h-2 rounded-full bg-slate-200">
          <div
            className="h-2 rounded-full bg-violet-600"
            style={{ width: percent }}
          />
        </div>
      </div>
      <ChevronRight size={18} />
    </button>
  );
}
