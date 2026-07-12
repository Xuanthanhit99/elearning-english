'use client';

import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Bot,
  CheckCircle2,
  Headphones,
  Loader2,
  Mic2,
  PencilLine,
  RefreshCw,
  Rocket,
  Sparkles,
  Target,
  Trophy,
  Type,
} from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  getPlacementDashboard,
  LearningSkill,
  PlacementDashboardData,
  retakePlacement,
} from '@/src/lib/placement-dashboard-api';

const skillMeta: Record<
  LearningSkill,
  { label: string; icon: typeof Type }
> = {
  VOCABULARY: { label: 'Từ vựng', icon: Type },
  GRAMMAR: { label: 'Ngữ pháp', icon: BookOpen },
  LISTENING: { label: 'Nghe hiểu', icon: Headphones },
  READING: { label: 'Đọc hiểu', icon: BookOpen },
  SPEAKING: { label: 'Nói', icon: Mic2 },
  WRITING: { label: 'Viết', icon: PencilLine },
};

export default function PlacementDashboardScreen() {
  const router = useRouter();
  const [data, setData] = useState<PlacementDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [retaking, setRetaking] = useState(false);
  const [showRetakeModal, setShowRetakeModal] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    try {
      setLoading(true);
      setError('');
      setData(await getPlacementDashboard());
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Không thể tải Placement Dashboard.',
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleRetake(force = false) {
    try {
      setRetaking(true);
      setError('');
      const result = await retakePlacement(force);
      router.push(result.nextUrl);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Không thể tạo bài kiểm tra mới.',
      );
      if (!force) setShowRetakeModal(true);
    } finally {
      setRetaking(false);
    }
  }

  const radarPoints = useMemo(() => {
    if (!data) return '';

    const order: LearningSkill[] = [
      'LISTENING',
      'SPEAKING',
      'READING',
      'WRITING',
      'GRAMMAR',
      'VOCABULARY',
    ];

    return order
      .map((skill, index) => {
        const item = data.skills.find((x) => x.skill === skill);
        const score = item?.status === 'SKIPPED' ? 0 : item?.score ?? 0;
        const angle = (-90 + index * 60) * (Math.PI / 180);
        const radius = 84 * (score / 100);

        return `${110 + Math.cos(angle) * radius},${
          110 + Math.sin(angle) * radius
        }`;
      })
      .join(' ');
  }, [data]);

  if (loading) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center p-6">
        <div className="text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-violet-600" />
          <p className="mt-4 font-black text-slate-900">
            Đang tải Placement Dashboard...
          </p>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <StatusState
        title="Không thể tải dữ liệu"
        description={error || 'Vui lòng thử lại.'}
        buttonLabel="Thử lại"
        onClick={() => void load()}
      />
    );
  }

  if (data.state === 'FIRST_TIME') {
    return (
      <StatusState
        title="Hãy bắt đầu Placement Test"
        description="AI sẽ đánh giá trình độ và tạo lộ trình học phù hợp cho bạn."
        buttonLabel="Bắt đầu kiểm tra"
        onClick={() => router.push('/placement/introduction')}
      />
    );
  }

  if (data.state === 'IN_PROGRESS') {
    return (
      <StatusState
        title="Bạn có bài kiểm tra chưa hoàn thành"
        description="Tiến trình của bạn đã được tự động lưu."
        buttonLabel="Tiếp tục bài kiểm tra"
        onClick={() =>
          router.push(data.currentTest?.testUrl ?? '/placement')
        }
      />
    );
  }

  if (data.state === 'PROCESSING') {
    return (
      <StatusState
        title="AI đang xử lý bài kiểm tra"
        description="Kết quả và lộ trình cá nhân hóa sẽ sớm hoàn tất."
        buttonLabel="Xem tiến trình"
        onClick={() =>
          router.push(
            data.currentTest?.processingUrl ?? '/placement',
          )
        }
      />
    );
  }

  const latest = data.latestResult;
  if (!latest) return null;

  return (
    <main className="min-h-screen bg-[linear-gradient(to_bottom,#faf9ff,#fff)] px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-[1500px] space-y-5">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(390px,0.95fr)]">
          <section className="rounded-[30px] border border-violet-100 bg-white p-6 shadow-[0_18px_60px_rgba(76,29,149,0.08)]">
            <div className="grid items-center gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
              <div className="relative h-[300px]">
                <Image
                  src="/images/placement/poppy-completed.png"
                  alt="Poppy chúc mừng"
                  fill
                  priority
                  className="object-contain"
                />
              </div>

              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  Đã hoàn thành
                </div>

                <h1 className="mt-4 text-4xl font-black text-slate-950">
                  Placement Test!
                </h1>

                <p className="mt-2 leading-7 text-slate-600">
                  Bạn đã hoàn thành bài kiểm tra đánh giá trình độ tiếng Anh.
                </p>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  <MetricCard
                    title="Trình độ của bạn"
                    value={latest.overallLevel}
                    footer={levelLabel(latest.overallLevel)}
                  />
                  <MetricCard
                    title="Độ tin cậy AI"
                    value={`${latest.confidence ?? 0}%`}
                    footer={`Phân tích từ ${latest.totalQuestions} câu hỏi`}
                  />
                  <MetricCard
                    title="Thứ hạng"
                    value={`${latest.percentile ?? 0}th`}
                    footer="so với người có kết quả tương tự"
                  />
                </div>

                <p className="mt-4 text-sm text-slate-500">
                  {latest.completedAt
                    ? new Date(latest.completedAt).toLocaleString('vi-VN')
                    : 'Vừa hoàn thành'}
                </p>
              </div>
            </div>
          </section>

          <aside className="rounded-[30px] border border-violet-100 bg-white p-6 shadow-[0_18px_60px_rgba(76,29,149,0.08)]">
            <h2 className="text-xl font-black text-slate-950">
              Bạn muốn làm gì tiếp theo?
            </h2>

            <div className="mt-5 space-y-3">
              <ActionRow
                icon={BookOpen}
                title="Tiếp tục học"
                description="Tiếp tục lộ trình cá nhân hóa dựa trên trình độ hiện tại."
                onClick={() =>
                  router.push(data.actions.continueLearningUrl)
                }
              />

              <ActionRow
                icon={RefreshCw}
                title="Làm lại bài kiểm tra"
                description={data.retake.message}
                badge={
                  data.retake.allowed
                    ? 'Có thể làm ngay'
                    : `Nên làm lại sau ${data.retake.remainingDays} ngày`
                }
                disabled={retaking}
                onClick={() => {
                  if (data.retake.allowed) {
                    void handleRetake();
                  } else {
                    setShowRetakeModal(true);
                  }
                }}
              />

              <ActionRow
                icon={BarChart3}
                title="Xem kết quả chi tiết"
                description="Phân tích sâu từng kỹ năng và gợi ý cải thiện."
                onClick={() => {
                  if (data.actions.detailedAnalysisUrl) {
                    router.push(data.actions.detailedAnalysisUrl);
                  }
                }}
              />
            </div>

            <div className="mt-5 rounded-2xl bg-violet-50 p-4">
              <div className="flex gap-3">
                <Sparkles className="h-5 w-5 shrink-0 text-violet-600" />
                <p className="text-sm leading-6 text-slate-600">
                  Luyện tập thường xuyên sẽ giúp cập nhật lộ trình chính xác hơn
                  trong lần kiểm tra tiếp theo.
                </p>
              </div>
            </div>
          </aside>
        </div>

        <section className="grid gap-4 lg:grid-cols-3">
          <SummaryCard
            title="Điểm mạnh nổi bật"
            items={latest.strengths}
            positive
            icon={Trophy}
          />
          <SummaryCard
            title="Kỹ năng cần cải thiện"
            items={latest.improvements}
            icon={Target}
          />
          <div className="rounded-[28px] border border-violet-100 bg-white p-6 shadow-[0_14px_45px_rgba(76,29,149,0.07)]">
            <div className="flex items-start gap-4">
              <Rocket className="h-10 w-10 shrink-0 text-violet-600" />
              <div>
                <h2 className="text-xl font-black text-slate-950">
                  Dự đoán tiến bộ
                </h2>
                <p className="mt-3 leading-7 text-slate-600">
                  Nếu học đều 20 phút/ngày, bạn có thể đạt{' '}
                  <strong className="text-violet-700">
                    {latest.projectedLevel ?? 'mức tiếp theo'}
                  </strong>{' '}
                  trong{' '}
                  <strong>
                    {latest.projectedWeeksMin ?? 0}–
                    {latest.projectedWeeksMax ?? 0} tuần
                  </strong>
                  .
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(390px,0.95fr)]">
          <div className="rounded-[30px] border border-violet-100 bg-white p-6 shadow-[0_18px_60px_rgba(76,29,149,0.08)]">
            <h2 className="text-2xl font-black text-slate-950">
              Tổng quan kỹ năng
            </h2>

            <div className="mt-6 grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
              <RadarChart
                points={radarPoints}
                overall={latest.overallScore}
              />

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

                      <span className="self-start rounded-full bg-slate-50 px-3 py-1 text-center text-xs font-bold text-slate-600">
                        {item.label ?? 'Đã đánh giá'}
                      </span>

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

          <div className="space-y-5">
            <PriorityPanel priorities={data.priorities} />
            <LearningPathPanel phases={data.learningPath} />
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)_minmax(0,1fr)]">
          <HistoryPanel
            history={data.history}
            onViewAll={() => router.push(data.actions.historyUrl)}
            onSelect={(url) => router.push(url)}
          />

          <ComparisonPanel
            comparison={data.comparison}
            currentLevel={latest.overallLevel}
          />

          <CoursePanel
            courses={data.recommendedCourses}
            onSelect={(slug) => {
              if (slug) router.push(`/courses/${slug}`);
            }}
          />
        </section>

        <section className="rounded-[30px] border border-violet-100 bg-gradient-to-r from-violet-50 to-fuchsia-50 p-6">
          <div className="grid items-center gap-5 lg:grid-cols-[minmax(0,1fr)_auto]">
            <div>
              <h2 className="text-2xl font-black text-slate-950">
                Tiếp tục hành trình học tập của bạn!
              </h2>
              <p className="mt-2 max-w-3xl leading-7 text-slate-600">
                Bạn đang ở trình độ {latest.overallLevel}. Hãy tiếp tục học
                theo lộ trình AI để cải thiện các kỹ năng ưu tiên.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                router.push(data.actions.continueLearningUrl)
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-700 to-fuchsia-600 px-6 py-4 font-black text-white"
            >
              Tiếp tục học
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </section>

        {error ? (
          <p className="rounded-2xl bg-red-50 p-4 text-sm text-red-600">
            {error}
          </p>
        ) : null}
      </div>

      {showRetakeModal ? (
        <RetakeModal
          message={data.retake.message}
          loading={retaking}
          onClose={() => setShowRetakeModal(false)}
          onConfirm={() => void handleRetake(true)}
        />
      ) : null}
    </main>
  );
}

function StatusState(props: {
  title: string;
  description: string;
  buttonLabel: string;
  onClick: () => void;
}) {
  return (
    <main className="flex min-h-[75vh] items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-xl rounded-[30px] bg-white p-9 text-center shadow-sm">
        <Bot className="mx-auto h-12 w-12 text-violet-600" />
        <h1 className="mt-5 text-3xl font-black text-slate-950">
          {props.title}
        </h1>
        <p className="mt-3 leading-7 text-slate-600">
          {props.description}
        </p>
        <button
          type="button"
          onClick={props.onClick}
          className="mt-7 rounded-xl bg-violet-600 px-7 py-4 font-black text-white"
        >
          {props.buttonLabel}
        </button>
      </div>
    </main>
  );
}

function MetricCard(props: {
  title: string;
  value: string;
  footer: string;
}) {
  return (
    <div className="rounded-2xl border border-violet-100 p-5 text-center">
      <p className="text-sm font-bold text-slate-500">{props.title}</p>
      <p className="mt-2 text-4xl font-black text-violet-700">
        {props.value}
      </p>
      <p className="mt-2 text-xs text-slate-500">{props.footer}</p>
    </div>
  );
}

function ActionRow(props: {
  icon: typeof Type;
  title: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
  badge?: string;
}) {
  const Icon = props.icon;

  return (
    <button
      type="button"
      disabled={props.disabled}
      onClick={props.onClick}
      className="flex w-full items-start gap-4 rounded-2xl border border-slate-100 p-4 text-left transition hover:border-violet-200 hover:bg-violet-50 disabled:opacity-50"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
        <Icon className="h-6 w-6" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-black text-slate-950">{props.title}</p>
          {props.badge ? (
            <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-500">
              {props.badge}
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          {props.description}
        </p>
      </div>
      <ArrowRight className="mt-3 h-5 w-5 text-violet-500" />
    </button>
  );
}

function SummaryCard(props: {
  title: string;
  items: string[];
  positive?: boolean;
  icon: typeof Type;
}) {
  const Icon = props.icon;

  return (
    <div
      className={`rounded-[28px] border p-6 ${
        props.positive
          ? 'border-emerald-100 bg-emerald-50/40'
          : 'border-orange-100 bg-orange-50/40'
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon
          className={`h-7 w-7 ${
            props.positive ? 'text-emerald-600' : 'text-orange-600'
          }`}
        />
        <h2 className="text-xl font-black text-slate-950">
          {props.title}
        </h2>
      </div>
      <div className="mt-4 space-y-2">
        {props.items.slice(0, 4).map((item) => (
          <p key={item} className="text-sm leading-6 text-slate-700">
            ✓ {item}
          </p>
        ))}
      </div>
    </div>
  );
}

function RadarChart(props: { points: string; overall: number }) {
  return (
    <div className="flex items-center justify-center">
      <svg viewBox="0 0 220 220" className="h-[250px] w-[250px]">
        {[84, 64, 44, 24].map((radius) => (
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
          />
        ))}
        <polygon
          points={props.points}
          fill="rgba(124,58,237,0.17)"
          stroke="#7c3aed"
          strokeWidth="3"
        />
        <circle cx="110" cy="110" r="30" fill="white" />
        <text x="110" y="106" textAnchor="middle" fontSize="12" fill="#64748b">
          Overall
        </text>
        <text
          x="110"
          y="128"
          textAnchor="middle"
          fontSize="22"
          fontWeight="800"
          fill="#5b21b6"
        >
          {Math.round(props.overall)}
        </text>
      </svg>
    </div>
  );
}

function PriorityPanel(props: {
  priorities: PlacementDashboardData['priorities'];
}) {
  return (
    <section className="rounded-[28px] border border-violet-100 bg-white p-6">
      <h2 className="text-xl font-black text-slate-950">
        Ưu tiên cải thiện (AI gợi ý)
      </h2>
      <div className="mt-4 space-y-3">
        {props.priorities.map((item) => (
          <div
            key={item.id}
            className="flex items-start gap-3 rounded-2xl border border-slate-100 p-4"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-600 font-black text-white">
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
  );
}

function LearningPathPanel(props: {
  phases: PlacementDashboardData['learningPath'];
}) {
  return (
    <section className="rounded-[28px] border border-violet-100 bg-white p-6">
      <h2 className="text-xl font-black text-slate-950">
        Lộ trình học tập cá nhân hóa
      </h2>
      <div className="mt-4 grid gap-3">
        {props.phases.map((phase) => (
          <div
            key={phase.id}
            className="rounded-2xl border border-violet-100 p-4"
          >
            <p className="text-sm font-black text-violet-700">
              Giai đoạn {phase.phase}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {phase.weeksMin}–{phase.weeksMax} tuần
            </p>
            <h3 className="mt-3 font-black text-slate-950">
              {phase.title}
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {phase.description}
            </p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-violet-600"
                style={{ width: `${phase.progress}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function HistoryPanel(props: {
  history: PlacementDashboardData['history'];
  onViewAll: () => void;
  onSelect: (url: string) => void;
}) {
  return (
    <section className="rounded-[28px] border border-violet-100 bg-white p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black text-slate-950">
          Lịch sử bài kiểm tra
        </h2>
        <button
          type="button"
          onClick={props.onViewAll}
          className="text-sm font-bold text-violet-700"
        >
          Xem tất cả
        </button>
      </div>
      <div className="mt-4 space-y-3">
        {props.history.slice(0, 3).map((item) => (
          <button
            key={item.testId}
            type="button"
            onClick={() => props.onSelect(item.resultUrl)}
            className="flex w-full items-center justify-between rounded-xl bg-slate-50 p-3 text-left"
          >
            <div>
              <p className="text-sm font-bold text-slate-700">
                {item.completedAt
                  ? new Date(item.completedAt).toLocaleDateString('vi-VN')
                  : 'Không rõ ngày'}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {item.isLatest ? 'Kết quả gần nhất' : levelLabel(item.level)}
              </p>
            </div>
            <div className="text-right">
              <span className="rounded-full bg-violet-600 px-3 py-1 text-xs font-black text-white">
                {item.level}
              </span>
              <p className="mt-1 text-xs font-bold text-slate-500">
                {Math.round(item.score)}/100
              </p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

function ComparisonPanel(props: {
  comparison: PlacementDashboardData['comparison'];
  currentLevel: string;
}) {
  return (
    <section className="rounded-[28px] border border-violet-100 bg-white p-6">
      <h2 className="text-lg font-black text-slate-950">
        So sánh tiến bộ
      </h2>
      {props.comparison.hasPrevious ? (
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <CompareMetric
            title="Điểm cũ"
            value={`${Math.round(
              props.comparison.previousScore ?? 0,
            )}/100`}
          />
          <CompareMetric
            title="Điểm số"
            value={`${
              (props.comparison.scoreDelta ?? 0) >= 0 ? '+' : ''
            }${Math.round(props.comparison.scoreDelta ?? 0)}`}
            positive={(props.comparison.scoreDelta ?? 0) >= 0}
          />
          <CompareMetric
            title="Cấp độ"
            value={`${props.comparison.previousLevel} → ${props.currentLevel}`}
            positive={(props.comparison.levelDelta ?? 0) >= 0}
          />
        </div>
      ) : (
        <p className="mt-5 rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">
          Đây là kết quả đầu tiên. Sau lần kiểm tra tiếp theo, hệ thống sẽ
          hiển thị tiến bộ tại đây.
        </p>
      )}
    </section>
  );
}

function CompareMetric(props: {
  title: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 text-center">
      <p className="text-xs font-bold text-slate-500">{props.title}</p>
      <p
        className={`mt-2 text-2xl font-black ${
          props.positive ? 'text-emerald-600' : 'text-violet-700'
        }`}
      >
        {props.value}
      </p>
    </div>
  );
}

function CoursePanel(props: {
  courses: PlacementDashboardData['recommendedCourses'];
  onSelect: (slug: string | null) => void;
}) {
  return (
    <section className="rounded-[28px] border border-violet-100 bg-white p-6">
      <h2 className="text-lg font-black text-slate-950">
        Khóa học AI đề xuất cho bạn
      </h2>
      <div className="mt-4 grid gap-3">
        {props.courses.slice(0, 3).map((course) => (
          <button
            key={course.id}
            type="button"
            onClick={() => props.onSelect(course.slug)}
            className="flex gap-4 rounded-2xl border border-slate-100 p-3 text-left hover:bg-violet-50"
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
                <BookOpen className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 text-violet-500" />
              )}
            </div>
            <div>
              <p className="font-black text-slate-950">{course.title}</p>
              <p className="mt-1 text-xs text-amber-500">
                ★ {course.rating ?? 0}
                {course.reviews !== null ? ` (${course.reviews})` : ''}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {course.lessonCount ?? 0} bài học
              </p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

function RetakeModal(props: {
  message: string;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[28px] bg-white p-7 shadow-2xl">
        <h2 className="text-2xl font-black text-slate-950">
          Làm lại Placement Test?
        </h2>
        <p className="mt-3 leading-7 text-slate-600">
          {props.message}
        </p>
        <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          Kết quả mới sẽ được lưu riêng và không xóa lịch sử cũ.
        </div>
        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={props.onClose}
            disabled={props.loading}
            className="rounded-xl border border-slate-200 px-5 py-3 font-bold text-slate-700"
          >
            Quay lại
          </button>
          <button
            type="button"
            onClick={props.onConfirm}
            disabled={props.loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 font-black text-white"
          >
            {props.loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : null}
            Vẫn làm lại
          </button>
        </div>
      </div>
    </div>
  );
}

function levelLabel(level: string) {
  const labels: Record<string, string> = {
    A1: 'Sơ cấp',
    A2: 'Sơ trung cấp',
    B1: 'Trung cấp',
    B2: 'Trung cấp cao',
    C1: 'Cao cấp',
    C2: 'Thành thạo',
  };
  return labels[level] ?? level;
}
