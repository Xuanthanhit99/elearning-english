'use client';

import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Bot,
  CheckCircle2,
  Clock3,
  Download,
  Headphones,
  Medal,
  Mic2,
  PencilLine,
  RefreshCw,
  Rocket,
  Share2,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  Type,
} from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  generatePlacementResult,
  LearningSkill,
  PlacementResultData,
} from '@/src/lib/placement-result-api';

const skillMeta: Record<
  LearningSkill,
  {
    label: string;
    icon: typeof Type;
  }
> = {
  VOCABULARY: { label: 'Từ vựng', icon: Type },
  GRAMMAR: { label: 'Ngữ pháp', icon: BookOpen },
  LISTENING: { label: 'Nghe hiểu', icon: Headphones },
  READING: { label: 'Đọc hiểu', icon: BookOpen },
  SPEAKING: { label: 'Nói', icon: Mic2 },
  WRITING: { label: 'Viết', icon: PencilLine },
};

export default function PlacementResultScreen({
  testId,
}: {
  testId: string;
}) {
  const router = useRouter();
  const [data, setData] = useState<PlacementResultData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    void (async () => {
      try {
        setError('');
        const result = await generatePlacementResult(testId);
        setData(result);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Không thể tải kết quả bài kiểm tra.',
        );
      }
    })();
  }, [testId]);

  const radarPoints = useMemo(() => {
    if (!data) return '';

    const values = data.skills.map((item) =>
      item.status === 'SKIPPED' ? 0 : item.score,
    );

    while (values.length < 6) values.push(0);

    return values
      .slice(0, 6)
      .map((value, index) => {
        const angle = (-90 + index * 60) * (Math.PI / 180);
        const radius = 82 * (value / 100);
        const x = 110 + Math.cos(angle) * radius;
        const y = 110 + Math.sin(angle) * radius;

        return `${x},${y}`;
      })
      .join(' ');
  }, [data]);

  if (!data) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center bg-slate-50 p-6">
        <div className="text-center">
          <RefreshCw className="mx-auto h-10 w-10 animate-spin text-violet-600" />
          <p className="mt-4 font-black text-slate-900">
            Đang chuẩn bị kết quả cá nhân hóa...
          </p>
          {error ? (
            <p className="mt-3 text-sm text-red-600">{error}</p>
          ) : null}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(to_bottom,#faf9ff,#fff)] px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-[1500px] space-y-5">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(390px,0.95fr)]">
          <section className="rounded-[30px] border border-violet-100 bg-white p-6 shadow-[0_18px_60px_rgba(76,29,149,0.08)]">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl font-black text-slate-950">
                  Kết quả bài kiểm tra trình độ 🎉
                </h1>
                <p className="mt-2 text-sm text-slate-500">
                  Hoàn thành:{' '}
                  {data.completedAt
                    ? new Date(data.completedAt).toLocaleString('vi-VN')
                    : 'Vừa xong'}
                </p>
              </div>

              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl border border-violet-200 px-4 py-3 font-bold text-violet-700 transition hover:bg-violet-50"
              >
                <Download className="h-4 w-4" />
                Tải chứng chỉ
              </button>
            </div>

            <div className="mt-7 grid items-center gap-6 lg:grid-cols-[230px_250px_minmax(0,1fr)]">
              <div className="relative h-[245px]">
                <Image
                  src="/images/placement/poppy-result.png"
                  alt="Poppy chúc mừng"
                  fill
                  priority
                  className="object-contain"
                />
              </div>

              <div className="text-center">
                <p className="font-bold text-slate-600">
                  Trình độ hiện tại
                </p>
                <div className="mt-2 text-7xl font-black text-violet-700">
                  {data.overview.overallLevel}
                </div>
                <p className="text-2xl font-black text-violet-700">
                  {levelLabel(data.overview.overallLevel)}
                </p>

                <div className="mx-auto mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-700">
                  <ShieldCheck className="h-4 w-4" />
                  Độ tin cậy AI {data.overview.confidence ?? 0}%
                </div>

                <p className="mt-4 text-sm leading-6 text-slate-600">
                  Bạn đã vượt qua{' '}
                  <strong className="text-violet-700">
                    {data.overview.percentile ?? 0}%
                  </strong>{' '}
                  người dùng cùng mức độ làm bài.
                </p>
              </div>

              <CefrGauge
                level={data.overview.overallLevel}
                score={data.overview.overallScore}
              />
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-4">
              <StatCard
                icon={CheckCircle2}
                value={data.analysis.totalQuestions}
                label="Câu hỏi đã phân tích"
              />
              <StatCard
                icon={Mic2}
                value={data.analysis.speakingCount}
                label="Bài Speaking"
              />
              <StatCard
                icon={PencilLine}
                value={data.analysis.writingCount}
                label="Bài Writing"
              />
              <StatCard
                icon={Clock3}
                value={data.overview.processedSeconds ?? 0}
                label="Giây xử lý"
              />
            </div>
          </section>

          <aside className="space-y-5">
            <section className="rounded-[30px] border border-violet-100 bg-white p-6 shadow-[0_18px_60px_rgba(76,29,149,0.08)]">
              <div className="flex items-center gap-2">
                <Bot className="h-6 w-6 text-violet-600" />
                <h2 className="text-xl font-black text-slate-950">
                  AI Coach – Tóm tắt kết quả
                </h2>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <InsightList
                  title="Điểm mạnh"
                  items={data.overview.strengths}
                  positive
                />
                <InsightList
                  title="Điểm cần cải thiện"
                  items={data.overview.improvements}
                />
              </div>

              <div className="mt-5 rounded-2xl border border-violet-100 bg-violet-50/50 p-5">
                <div className="flex items-start gap-3">
                  <Rocket className="mt-1 h-7 w-7 shrink-0 text-violet-600" />
                  <div>
                    <p className="font-black text-violet-700">
                      Tiềm năng phát triển
                    </p>
                    <p className="mt-2 leading-7 text-slate-700">
                      Nếu học 20 phút mỗi ngày, AI dự đoán bạn có thể đạt{' '}
                      <strong>
                        {data.overview.projectedLevel ?? 'mức tiếp theo'}
                      </strong>{' '}
                      trong{' '}
                      <strong>
                        {data.overview.projectedWeeksMin ?? 0}–
                        {data.overview.projectedWeeksMax ?? 0} tuần
                      </strong>
                      .
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <LearningPathCard data={data} />
          </aside>
        </div>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(420px,0.8fr)]">
          <div className="rounded-[30px] border border-violet-100 bg-white p-6 shadow-[0_18px_60px_rgba(76,29,149,0.08)]">
            <h2 className="text-2xl font-black text-slate-950">
              Kết quả theo kỹ năng
            </h2>

            <div className="mt-6 grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
              <RadarChart points={radarPoints} overall={data.overview.overallScore} />

              <div className="space-y-3">
                {data.skills.map((item) => {
                  const meta = skillMeta[item.skill];
                  const Icon = meta.icon;

                  return (
                    <div
                      key={item.skill}
                      className="grid gap-4 rounded-2xl border border-slate-100 p-4 md:grid-cols-[160px_90px_110px_minmax(0,1fr)]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                          <Icon className="h-5 w-5" />
                        </div>
                        <span className="font-black text-slate-900">
                          {meta.label}
                        </span>
                      </div>

                      <div className="text-2xl font-black text-violet-700">
                        {item.status === 'SKIPPED'
                          ? '—'
                          : Math.round(item.score)}
                        <span className="text-sm text-slate-400">
                          /100
                        </span>
                      </div>

                      <div>
                        <p className="text-amber-500">
                          {'★'.repeat(
                            Math.max(
                              0,
                              Math.min(
                                5,
                                Math.round(item.rating ?? 0),
                              ),
                            ),
                          )}
                          <span className="text-slate-200">
                            {'★'.repeat(
                              5 -
                                Math.max(
                                  0,
                                  Math.min(
                                    5,
                                    Math.round(item.rating ?? 0),
                                  ),
                                ),
                            )}
                          </span>
                        </p>
                        <span className="mt-1 inline-block rounded-full bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600">
                          {item.label ?? 'Đã đánh giá'}
                        </span>
                      </div>

                      <div className="text-sm leading-6 text-slate-600">
                        <p>{item.feedback}</p>
                        {item.improvements[0] ? (
                          <p className="mt-1 text-orange-600">
                            Cần cải thiện: {item.improvements[0]}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <PriorityAndCourses data={data} />
        </section>

        <section className="rounded-[30px] border border-violet-100 bg-white p-6 shadow-[0_18px_60px_rgba(76,29,149,0.08)]">
          <h2 className="text-xl font-black text-slate-950">
            Phân tích chi tiết từng kỹ năng
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            AI đã phân tích sâu và đưa ra nhận xét cụ thể để giúp bạn cải
            thiện hiệu quả hơn.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {data.skills.map((item) => {
              const meta = skillMeta[item.skill];
              const Icon = meta.icon;

              return (
                <button
                  key={item.skill}
                  type="button"
                  onClick={() =>
                    router.push(data.actions.detailedAnalysisUrl)
                  }
                  className="rounded-2xl border border-violet-100 p-4 text-left transition hover:-translate-y-0.5 hover:bg-violet-50"
                >
                  <Icon className="h-6 w-6 text-violet-600" />
                  <p className="mt-3 font-black text-slate-900">
                    {meta.label}
                  </p>
                  <p className="mt-1 text-sm font-bold text-violet-700">
                    Xem chi tiết
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <ActionButton
            primary
            label="Học ngay lộ trình này"
            onClick={() =>
              router.push(data.actions.startLearningUrl)
            }
          />
          <ActionButton
            label="Làm lại bài kiểm tra"
            onClick={() => router.push(data.actions.retryTestUrl)}
          />
          <ActionButton
            label="Chọn lộ trình khác"
            onClick={() =>
              router.push(data.actions.chooseOtherPathUrl)
            }
          />
          <ActionButton
            label="Xem phân tích chi tiết"
            onClick={() =>
              router.push(data.actions.detailedAnalysisUrl)
            }
          />
        </div>
      </div>
    </main>
  );
}

function StatCard({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Type;
  value: number;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-violet-100 p-4">
      <Icon className="h-6 w-6 text-violet-600" />
      <div>
        <p className="text-xl font-black text-slate-950">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );
}

function InsightList({
  title,
  items,
  positive = false,
}: {
  title: string;
  items: string[];
  positive?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        positive
          ? 'border-emerald-100 bg-emerald-50/60'
          : 'border-orange-100 bg-orange-50/60'
      }`}
    >
      <h3
        className={`font-black ${
          positive ? 'text-emerald-700' : 'text-orange-700'
        }`}
      >
        {title}
      </h3>
      <div className="mt-3 space-y-2">
        {items.map((item) => (
          <p key={item} className="text-sm leading-6 text-slate-700">
            ✓ {item}
          </p>
        ))}
      </div>
    </div>
  );
}

function CefrGauge({
  level,
  score,
}: {
  level: string;
  score: number;
}) {
  const angle = -90 + (Math.max(0, Math.min(100, score)) / 100) * 180;

  return (
    <div className="text-center">
      <p className="font-black text-slate-700">Thang đo CEFR</p>
      <div className="relative mx-auto mt-3 h-[190px] w-[330px] overflow-hidden">
        <div className="absolute left-1/2 top-4 h-[280px] w-[280px] -translate-x-1/2 rounded-full border-[42px] border-violet-100 border-b-transparent border-l-orange-300 border-r-violet-500 border-t-violet-300" />
        <div
          className="absolute bottom-4 left-1/2 h-24 w-2 origin-bottom rounded-full bg-violet-700 transition-transform"
          style={{
            transform: `translateX(-50%) rotate(${angle}deg)`,
          }}
        />
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-violet-700 px-6 py-2 text-2xl font-black text-white">
          {level}
        </div>
      </div>
    </div>
  );
}

function RadarChart({
  points,
  overall,
}: {
  points: string;
  overall: number;
}) {
  return (
    <div className="flex items-center justify-center">
      <svg viewBox="0 0 220 220" className="h-[250px] w-[250px]">
        {[82, 62, 42, 22].map((radius) => (
          <polygon
            key={radius}
            points={Array.from({ length: 6 })
              .map((_, index) => {
                const angle = (-90 + index * 60) * (Math.PI / 180);
                return `${110 + Math.cos(angle) * radius},${
                  110 + Math.sin(angle) * radius
                }`;
              })
              .join(' ')}
            fill="none"
            stroke="#ddd6fe"
            strokeWidth="1"
          />
        ))}
        <polygon
          points={points}
          fill="rgba(124,58,237,0.18)"
          stroke="#7c3aed"
          strokeWidth="3"
        />
        <circle cx="110" cy="110" r="30" fill="white" />
        <text
          x="110"
          y="106"
          textAnchor="middle"
          fontSize="12"
          fill="#64748b"
        >
          Overall
        </text>
        <text
          x="110"
          y="126"
          textAnchor="middle"
          fontSize="20"
          fontWeight="800"
          fill="#5b21b6"
        >
          {Math.round(overall)}
        </text>
      </svg>
    </div>
  );
}

function LearningPathCard({
  data,
}: {
  data: PlacementResultData;
}) {
  return (
    <section className="rounded-[30px] border border-violet-100 bg-white p-6 shadow-[0_18px_60px_rgba(76,29,149,0.08)]">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-black text-slate-950">
          Lộ trình học tập được đề xuất bởi AI
        </h2>
        <Target className="h-6 w-6 text-violet-600" />
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
        {data.learningPath.phases.map((phase) => (
          <div
            key={phase.phase}
            className="rounded-2xl border border-violet-100 p-4"
          >
            <p className="font-black text-violet-700">
              Giai đoạn {phase.phase}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {phase.weeksMin}–{phase.weeksMax} tuần
            </p>
            <h3 className="mt-3 font-black text-slate-950">
              {phase.title}
              {phase.targetLevel ? ` (${phase.targetLevel})` : ''}
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {phase.description}
            </p>
            <div className="mt-3 space-y-1">
              {phase.objectives.slice(0, 3).map((item) => (
                <p key={item} className="text-xs text-slate-600">
                  ✓ {item}
                </p>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function PriorityAndCourses({
  data,
}: {
  data: PlacementResultData;
}) {
  return (
    <div className="space-y-5">
      <section className="rounded-[30px] border border-violet-100 bg-white p-6 shadow-[0_18px_60px_rgba(76,29,149,0.08)]">
        <h2 className="text-xl font-black text-slate-950">
          Ưu tiên phát triển
        </h2>

        <div className="mt-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
          {data.learningPath.priorities.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-3 rounded-2xl border border-violet-100 p-4"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-600 font-black text-white">
                {item.priority}
              </span>
              <div>
                <p className="font-black text-violet-700">
                  {skillMeta[item.skill].label}
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {item.reason}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[30px] border border-violet-100 bg-white p-6 shadow-[0_18px_60px_rgba(76,29,149,0.08)]">
        <h2 className="text-xl font-black text-slate-950">
          Khóa học AI đề xuất cho bạn
        </h2>

        <div className="mt-4 space-y-3">
          {data.recommendedCourses.map((course) => (
            <div
              key={course.id}
              className="flex gap-4 rounded-2xl border border-slate-100 p-4"
            >
              <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-xl bg-violet-50">
                {course.thumbnail ? (
                  <Image
                    src={course.thumbnail}
                    alt={course.title}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <BarChart3 className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 text-violet-500" />
                )}
              </div>

              <div>
                <p className="font-black text-slate-950">
                  {course.title}
                </p>
                <p className="mt-1 text-xs text-amber-500">
                  ★ {course.rating ?? 0}
                  {course.reviews !== null
                    ? ` (${course.reviews})`
                    : ''}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {course.lessonCount ?? 0} bài học
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[30px] border border-violet-100 bg-white p-6 shadow-[0_18px_60px_rgba(76,29,149,0.08)]">
        <div className="flex items-center gap-2">
          <Medal className="h-6 w-6 text-amber-500" />
          <h2 className="text-xl font-black text-slate-950">
            Chứng chỉ của bạn
          </h2>
        </div>

        <div className="mt-5 rounded-2xl border-2 border-violet-200 bg-violet-50/50 p-6 text-center">
          <Trophy className="mx-auto h-10 w-10 text-amber-500" />
          <p className="mt-3 text-5xl font-black text-violet-700">
            {data.certificate.level}
          </p>
          <p className="mt-1 font-bold text-slate-600">
            {levelLabel(data.certificate.level)}
          </p>
          <p className="mt-4 text-xs text-slate-400">
            {data.certificate.code}
          </p>
        </div>

        <button
          type="button"
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-violet-200 px-4 py-3 font-black text-violet-700"
        >
          <Share2 className="h-4 w-4" />
          Chia sẻ kết quả
        </button>
      </section>
    </div>
  );
}

function ActionButton({
  label,
  onClick,
  primary = false,
}: {
  label: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-4 font-black transition ${
        primary
          ? 'bg-gradient-to-r from-violet-700 to-fuchsia-600 text-white shadow-lg shadow-violet-200'
          : 'border border-violet-100 bg-white text-violet-700 hover:bg-violet-50'
      }`}
    >
      {label}
      <ArrowRight className="h-5 w-5" />
    </button>
  );
}

function levelLabel(level: string) {
  const labels: Record<string, string> = {
    A1: 'Sơ cấp',
    A2: 'Sơ trung cấp',
    B1: 'Intermediate',
    B2: 'Trung cấp cao',
    C1: 'Cao cấp',
    C2: 'Thành thạo',
  };

  return labels[level] ?? level;
}
