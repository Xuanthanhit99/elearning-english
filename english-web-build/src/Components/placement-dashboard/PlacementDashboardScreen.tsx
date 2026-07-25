'use client';

import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Bot,
  CheckCircle2,
  Headphones,
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
import {
  BeaconVieButton,
  BeaconVieDialog,
  BeaconVieDialogCloseButton,
  BeaconVieSkeleton,
  BeaconVieState,
} from '@/src/Components/UI/BeaconVie';

const skillMeta: Record<
  LearningSkill,
  { label: string; icon: typeof Type }
> = {
  VOCABULARY: { label: 'Tá»« vá»±ng', icon: Type },
  GRAMMAR: { label: 'Ngá»¯ phÃ¡p', icon: BookOpen },
  LISTENING: { label: 'Nghe hiá»ƒu', icon: Headphones },
  READING: { label: 'Äá»c hiá»ƒu', icon: BookOpen },
  SPEAKING: { label: 'NÃ³i', icon: Mic2 },
  WRITING: { label: 'Viáº¿t', icon: PencilLine },
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
          : 'KhÃ´ng thá»ƒ táº£i Placement Dashboard.',
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
          : 'KhÃ´ng thá»ƒ táº¡o bÃ i kiá»ƒm tra má»›i.',
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

  const radarSummary = useMemo(() => {
    if (!data) return '';
    return data.skills
      .map((item) => {
        const label = skillMeta[item.skill].label;
        const score = item.status === 'SKIPPED' ? 'chÆ°a Ä‘Ã¡nh giÃ¡' : `${Math.round(item.score)}/100`;
        return `${label}: ${score}`;
      })
      .join(', ');
  }, [data]);

  if (loading) {
    return (
      <main
        className="min-h-screen px-4 py-6 sm:px-6"
        aria-busy="true"
        aria-live="polite"
      >
        <span className="sr-only">Äang táº£i Placement Dashboardâ€¦</span>
        <div className="mx-auto max-w-[1500px] space-y-5">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(390px,0.95fr)]">
            <BeaconVieSkeleton className="h-[320px]" />
            <BeaconVieSkeleton className="h-[320px]" />
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <BeaconVieSkeleton className="h-[180px]" />
            <BeaconVieSkeleton className="h-[180px]" />
            <BeaconVieSkeleton className="h-[180px]" />
          </div>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-2xl items-center justify-center px-4 py-10">
        <BeaconVieState
          title="KhÃ´ng thá»ƒ táº£i dá»¯ liá»‡u"
          description={error || 'Vui lÃ²ng Thử lại.'}
          actionLabel="Thử lại"
          tone="error"
          onAction={() => void load()}
        />
      </main>
    );
  }

  if (data.state === 'FIRST_TIME') {
    return (
      <StatusState
        title="HÃ£y báº¯t Ä‘áº§u Placement Test"
        description="AI sáº½ Ä‘Ã¡nh giÃ¡ trÃ¬nh Ä‘á»™ vÃ  táº¡o lá»™ trÃ¬nh há»c phÃ¹ há»£p cho báº¡n."
        buttonLabel="Báº¯t Ä‘áº§u kiá»ƒm tra"
        onClick={() => router.push('/placement/introduction')}
      />
    );
  }

  if (data.state === 'IN_PROGRESS') {
    return (
      <StatusState
        title="Báº¡n cÃ³ bÃ i kiá»ƒm tra chÆ°a hoÃ n thÃ nh"
        description="Tiáº¿n trÃ¬nh cá»§a báº¡n Ä‘Ã£ Ä‘Æ°á»£c tá»± Ä‘á»™ng lÆ°u."
        buttonLabel="Tiáº¿p tá»¥c bÃ i kiá»ƒm tra"
        onClick={() =>
          router.push(data.currentTest?.testUrl ?? '/placement')
        }
      />
    );
  }

  if (data.state === 'PROCESSING') {
    return (
      <StatusState
        title="AI Ä‘ang xá»­ lÃ½ bÃ i kiá»ƒm tra"
        description="Káº¿t quáº£ vÃ  lá»™ trÃ¬nh cÃ¡ nhÃ¢n hÃ³a sáº½ sá»›m hoÃ n táº¥t."
        buttonLabel="Xem tiáº¿n trÃ¬nh"
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
    <main className="min-h-screen px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-[1500px] space-y-5">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(390px,0.95fr)]">
          <section className="BeaconVie-card p-6">
            <div className="grid items-center gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
              <div className="relative h-[300px]">
                <Image
                  src="/images/placement/BeaconVie-completed.png"
                  alt="Beacon chÃºc má»«ng"
                  fill
                  priority
                  className="object-contain"
                />
              </div>

              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                  <CheckCircle2 aria-hidden className="h-4 w-4" />
                  ÄÃ£ hoÃ n thÃ nh
                </div>

                <h1 className="mt-4 text-4xl font-black text-[var(--BeaconVie-ink)]">
                  Placement Test!
                </h1>

                <p className="mt-2 leading-7 text-[var(--BeaconVie-muted)]">
                  Báº¡n Ä‘Ã£ hoÃ n thÃ nh bÃ i kiá»ƒm tra Ä‘Ã¡nh giÃ¡ trÃ¬nh Ä‘á»™ tiáº¿ng Anh.
                </p>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  <MetricCard
                    title="TrÃ¬nh Ä‘á»™ cá»§a báº¡n"
                    value={latest.overallLevel}
                    footer={levelLabel(latest.overallLevel)}
                  />
                  <MetricCard
                    title="Äá»™ tin cáº­y AI"
                    value={`${latest.confidence ?? 0}%`}
                    footer={`PhÃ¢n tÃ­ch tá»« ${latest.totalQuestions} cÃ¢u há»i`}
                  />
                  <MetricCard
                    title="Thá»© háº¡ng"
                    value={`${latest.percentile ?? 0}th`}
                    footer="so vá»›i ngÆ°á»i cÃ³ káº¿t quáº£ tÆ°Æ¡ng tá»±"
                  />
                </div>

                <p className="mt-4 text-sm text-[var(--BeaconVie-muted)]">
                  {latest.completedAt
                    ? new Date(latest.completedAt).toLocaleString('vi-VN')
                    : 'Vá»«a hoÃ n thÃ nh'}
                </p>
              </div>
            </div>
          </section>

          <aside className="BeaconVie-card p-6">
            <h2 className="text-xl font-black text-[var(--BeaconVie-ink)]">
              Báº¡n muá»‘n lÃ m gÃ¬ tiáº¿p theo?
            </h2>

            <div className="mt-5 space-y-3">
              <ActionRow
                icon={BookOpen}
                title="Tiáº¿p tá»¥c há»c"
                description="Tiáº¿p tá»¥c lá»™ trÃ¬nh cÃ¡ nhÃ¢n hÃ³a dá»±a trÃªn trÃ¬nh Ä‘á»™ hiá»‡n táº¡i."
                onClick={() =>
                  router.push(data.actions.continueLearningUrl)
                }
              />

              <ActionRow
                icon={RefreshCw}
                title="LÃ m láº¡i bÃ i kiá»ƒm tra"
                description={data.retake.message}
                badge={
                  data.retake.allowed
                    ? 'CÃ³ thá»ƒ lÃ m ngay'
                    : `NÃªn lÃ m láº¡i sau ${data.retake.remainingDays} ngÃ y`
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
                title="Xem káº¿t quáº£ chi tiáº¿t"
                description="PhÃ¢n tÃ­ch sÃ¢u tá»«ng ká»¹ nÄƒng vÃ  gá»£i Ã½ cáº£i thiá»‡n."
                onClick={() => {
                  if (data.actions.detailedAnalysisUrl) {
                    router.push(data.actions.detailedAnalysisUrl);
                  }
                }}
              />
            </div>

            <div className="mt-5 rounded-2xl bg-blue-50 p-4 dark:bg-white/8">
              <div className="flex gap-3">
                <Sparkles aria-hidden className="h-5 w-5 shrink-0 text-[var(--BeaconVie-primary)]" />
                <p className="text-sm leading-6 text-[var(--BeaconVie-muted)]">
                  Luyá»‡n táº­p thÆ°á»ng xuyÃªn sáº½ giÃºp cáº­p nháº­t lá»™ trÃ¬nh chÃ­nh xÃ¡c hÆ¡n
                  trong láº§n kiá»ƒm tra tiáº¿p theo.
                </p>
              </div>
            </div>
          </aside>
        </div>

        <section className="grid gap-4 lg:grid-cols-3">
          <SummaryCard
            title="Äiá»ƒm máº¡nh ná»•i báº­t"
            items={latest.strengths}
            positive
            icon={Trophy}
          />
          <SummaryCard
            title="Ká»¹ nÄƒng cáº§n cáº£i thiá»‡n"
            items={latest.improvements}
            icon={Target}
          />
          <div className="BeaconVie-card p-6">
            <div className="flex items-start gap-4">
              <Rocket aria-hidden className="h-10 w-10 shrink-0 text-[var(--BeaconVie-primary)]" />
              <div>
                <h2 className="text-xl font-black text-[var(--BeaconVie-ink)]">
                  Dá»± Ä‘oÃ¡n tiáº¿n bá»™
                </h2>
                <p className="mt-3 leading-7 text-[var(--BeaconVie-muted)]">
                  Náº¿u há»c Ä‘á»u 20 phÃºt/ngÃ y, báº¡n cÃ³ thá»ƒ Ä‘áº¡t{' '}
                  <strong className="text-[var(--BeaconVie-primary)]">
                    {latest.projectedLevel ?? 'má»©c tiáº¿p theo'}
                  </strong>{' '}
                  trong{' '}
                  <strong className="text-[var(--BeaconVie-ink)]">
                    {latest.projectedWeeksMin ?? 0}â€“
                    {latest.projectedWeeksMax ?? 0} tuáº§n
                  </strong>
                  .
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(390px,0.95fr)]">
          <div className="BeaconVie-card p-6">
            <h2 className="text-2xl font-black text-[var(--BeaconVie-ink)]">
              Tá»•ng quan ká»¹ nÄƒng
            </h2>

            <div className="mt-6 grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
              <RadarChart
                points={radarPoints}
                overall={latest.overallScore}
                summary={radarSummary}
              />

              <div className="space-y-3">
                {data.skills.map((item) => {
                  const meta = skillMeta[item.skill];
                  const Icon = meta.icon;

                  return (
                    <div
                      key={item.skill}
                      className="grid gap-4 rounded-2xl border border-[var(--BeaconVie-border)] p-4 md:grid-cols-[160px_90px_110px_minmax(0,1fr)]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-[var(--BeaconVie-primary)] dark:bg-white/8">
                          <Icon aria-hidden className="h-5 w-5" />
                        </div>
                        <span className="font-black text-[var(--BeaconVie-ink)]">
                          {meta.label}
                        </span>
                      </div>

                      <div className="text-2xl font-black text-[var(--BeaconVie-primary)]">
                        {item.status === 'SKIPPED'
                          ? 'â€”'
                          : Math.round(item.score)}
                        <span className="text-sm text-[var(--BeaconVie-muted)]">
                          /100
                        </span>
                      </div>

                      <span className="self-start rounded-full bg-black/5 px-3 py-1 text-center text-xs font-bold text-[var(--BeaconVie-muted)] dark:bg-white/8">
                        {item.label ?? 'ÄÃ£ Ä‘Ã¡nh giÃ¡'}
                      </span>

                      <div className="text-sm leading-6 text-[var(--BeaconVie-muted)]">
                        <p>{item.feedback}</p>
                        {item.improvements[0] ? (
                          <p className="mt-1 text-orange-600 dark:text-orange-400">
                            Cáº§n cáº£i thiá»‡n: {item.improvements[0]}
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

        <section className="BeaconVie-card p-6">
          <div className="grid items-center gap-5 lg:grid-cols-[minmax(0,1fr)_auto]">
            <div>
              <h2 className="text-2xl font-black text-[var(--BeaconVie-ink)]">
                Tiáº¿p tá»¥c hÃ nh trÃ¬nh há»c táº­p cá»§a báº¡n!
              </h2>
              <p className="mt-2 max-w-3xl leading-7 text-[var(--BeaconVie-muted)]">
                Báº¡n Ä‘ang á»Ÿ trÃ¬nh Ä‘á»™ {latest.overallLevel}. HÃ£y tiáº¿p tá»¥c há»c
                theo lá»™ trÃ¬nh AI Ä‘á»ƒ cáº£i thiá»‡n cÃ¡c ká»¹ nÄƒng Æ°u tiÃªn.
              </p>
            </div>

            <BeaconVieButton
              onClick={() => router.push(data.actions.continueLearningUrl)}
            >
              Tiáº¿p tá»¥c há»c
              <ArrowRight aria-hidden className="h-5 w-5" />
            </BeaconVieButton>
          </div>
        </section>

        {error ? (
          <p className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
            {error}
          </p>
        ) : null}
      </div>

      <RetakeDialog
        open={showRetakeModal}
        message={data.retake.message}
        loading={retaking}
        onClose={() => setShowRetakeModal(false)}
        onConfirm={() => void handleRetake(true)}
      />
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
    <main className="flex min-h-[75vh] items-center justify-center p-6">
      <div className="w-full max-w-xl BeaconVie-card p-9 text-center">
        <Bot aria-hidden className="mx-auto h-12 w-12 text-[var(--BeaconVie-primary)]" />
        <h1 className="mt-5 text-3xl font-black text-[var(--BeaconVie-ink)]">
          {props.title}
        </h1>
        <p className="mt-3 leading-7 text-[var(--BeaconVie-muted)]">
          {props.description}
        </p>
        <BeaconVieButton className="mt-7" onClick={props.onClick}>
          {props.buttonLabel}
        </BeaconVieButton>
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
    <div className="rounded-2xl border border-[var(--BeaconVie-border)] p-5 text-center">
      <p className="text-sm font-bold text-[var(--BeaconVie-muted)]">{props.title}</p>
      <p className="mt-2 text-4xl font-black text-[var(--BeaconVie-primary)]">
        {props.value}
      </p>
      <p className="mt-2 text-xs text-[var(--BeaconVie-muted)]">{props.footer}</p>
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
      className="flex w-full items-start gap-4 rounded-2xl border border-[var(--BeaconVie-border)] p-4 text-left transition hover:border-[var(--BeaconVie-primary)] hover:bg-blue-50 disabled:opacity-50 dark:hover:bg-white/8"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[var(--BeaconVie-primary)] dark:bg-white/8">
        <Icon aria-hidden className="h-6 w-6" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-black text-[var(--BeaconVie-ink)]">{props.title}</p>
          {props.badge ? (
            <span className="rounded-full bg-black/5 px-2 py-1 text-[11px] font-bold text-[var(--BeaconVie-muted)] dark:bg-white/8">
              {props.badge}
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-sm leading-6 text-[var(--BeaconVie-muted)]">
          {props.description}
        </p>
      </div>
      <ArrowRight aria-hidden className="mt-3 h-5 w-5 shrink-0 text-[var(--BeaconVie-primary)]" />
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
      className={`BeaconVie-card p-6 ${
        props.positive
          ? 'border-emerald-200/60 bg-emerald-50/40 dark:bg-emerald-500/10'
          : 'border-orange-200/60 bg-orange-50/40 dark:bg-orange-500/10'
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon
          aria-hidden
          className={`h-7 w-7 ${
            props.positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-orange-600 dark:text-orange-400'
          }`}
        />
        <h2 className="text-xl font-black text-[var(--BeaconVie-ink)]">
          {props.title}
        </h2>
      </div>
      <div className="mt-4 space-y-2">
        {props.items.slice(0, 4).map((item) => (
          <p key={item} className="text-sm leading-6 text-[var(--BeaconVie-ink)]">
            âœ“ {item}
          </p>
        ))}
      </div>
    </div>
  );
}

function RadarChart(props: { points: string; overall: number; summary: string }) {
  return (
    <div className="flex items-center justify-center">
      <svg
        viewBox="0 0 220 220"
        className="h-[250px] w-[250px]"
        role="img"
        aria-label={`Biá»ƒu Ä‘á»“ tá»•ng quan ká»¹ nÄƒng. Äiá»ƒm tá»•ng: ${Math.round(props.overall)}/100. ${props.summary}`}
      >
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
            stroke="var(--BeaconVie-border)"
          />
        ))}
        <polygon
          points={props.points}
          fill="rgba(23,70,255,0.16)"
          stroke="var(--BeaconVie-primary)"
          strokeWidth="3"
        />
        <circle cx="110" cy="110" r="30" fill="var(--BeaconVie-card)" />
        <text x="110" y="106" textAnchor="middle" fontSize="12" fill="var(--BeaconVie-muted)">
          Overall
        </text>
        <text
          x="110"
          y="128"
          textAnchor="middle"
          fontSize="22"
          fontWeight="800"
          fill="var(--BeaconVie-primary)"
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
    <section className="BeaconVie-card p-6">
      <h2 className="text-xl font-black text-[var(--BeaconVie-ink)]">
        Æ¯u tiÃªn cáº£i thiá»‡n (AI gá»£i Ã½)
      </h2>
      <div className="mt-4 space-y-3">
        {props.priorities.map((item) => (
          <div
            key={item.id}
            className="flex items-start gap-3 rounded-2xl border border-[var(--BeaconVie-border)] p-4"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--BeaconVie-primary)] font-black text-white">
              {item.priority}
            </span>
            <div>
              <p className="font-black text-[var(--BeaconVie-primary)]">
                {skillMeta[item.skill].label}
              </p>
              <p className="mt-1 text-sm leading-6 text-[var(--BeaconVie-muted)]">
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
    <section className="BeaconVie-card p-6">
      <h2 className="text-xl font-black text-[var(--BeaconVie-ink)]">
        Lá»™ trÃ¬nh há»c táº­p cÃ¡ nhÃ¢n hÃ³a
      </h2>
      <div className="mt-4 grid gap-3">
        {props.phases.map((phase) => (
          <div
            key={phase.id}
            className="rounded-2xl border border-[var(--BeaconVie-border)] p-4"
          >
            <p className="text-sm font-black text-[var(--BeaconVie-primary)]">
              Giai Ä‘oáº¡n {phase.phase}
            </p>
            <p className="mt-1 text-xs text-[var(--BeaconVie-muted)]">
              {phase.weeksMin}â€“{phase.weeksMax} tuáº§n
            </p>
            <h3 className="mt-3 font-black text-[var(--BeaconVie-ink)]">
              {phase.title}
            </h3>
            <p className="mt-2 text-sm leading-6 text-[var(--BeaconVie-muted)]">
              {phase.description}
            </p>
            <div className="mt-4 BeaconVie-progress h-2">
              <div style={{ width: `${phase.progress}%` }} />
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
    <section className="BeaconVie-card p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black text-[var(--BeaconVie-ink)]">
          Lá»‹ch sá»­ bÃ i kiá»ƒm tra
        </h2>
        <button
          type="button"
          onClick={props.onViewAll}
          className="text-sm font-bold text-[var(--BeaconVie-primary)]"
        >
          Xem táº¥t cáº£
        </button>
      </div>
      <div className="mt-4 space-y-3">
        {props.history.slice(0, 3).map((item) => (
          <button
            key={item.testId}
            type="button"
            onClick={() => props.onSelect(item.resultUrl)}
            className="flex w-full items-center justify-between rounded-xl bg-black/[0.03] p-3 text-left dark:bg-white/5"
          >
            <div>
              <p className="text-sm font-bold text-[var(--BeaconVie-ink)]">
                {item.completedAt
                  ? new Date(item.completedAt).toLocaleDateString('vi-VN')
                  : 'KhÃ´ng rÃµ ngÃ y'}
              </p>
              <p className="mt-1 text-xs text-[var(--BeaconVie-muted)]">
                {item.isLatest ? 'Káº¿t quáº£ gáº§n nháº¥t' : levelLabel(item.level)}
              </p>
            </div>
            <div className="text-right">
              <span className="rounded-full bg-[var(--BeaconVie-primary)] px-3 py-1 text-xs font-black text-white">
                {item.level}
              </span>
              <p className="mt-1 text-xs font-bold text-[var(--BeaconVie-muted)]">
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
    <section className="BeaconVie-card p-6">
      <h2 className="text-lg font-black text-[var(--BeaconVie-ink)]">
        So sÃ¡nh tiáº¿n bá»™
      </h2>
      {props.comparison.hasPrevious ? (
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <CompareMetric
            title="Äiá»ƒm cÅ©"
            value={`${Math.round(
              props.comparison.previousScore ?? 0,
            )}/100`}
          />
          <CompareMetric
            title="Äiá»ƒm sá»‘"
            value={`${
              (props.comparison.scoreDelta ?? 0) >= 0 ? '+' : ''
            }${Math.round(props.comparison.scoreDelta ?? 0)}`}
            positive={(props.comparison.scoreDelta ?? 0) >= 0}
          />
          <CompareMetric
            title="Cáº¥p Ä‘á»™"
            value={`${props.comparison.previousLevel} â†’ ${props.currentLevel}`}
            positive={(props.comparison.levelDelta ?? 0) >= 0}
          />
        </div>
      ) : (
        <p className="mt-5 rounded-2xl bg-black/[0.03] p-5 text-sm text-[var(--BeaconVie-muted)] dark:bg-white/5">
          ÄÃ¢y lÃ  káº¿t quáº£ Ä‘áº§u tiÃªn. Sau láº§n kiá»ƒm tra tiáº¿p theo, há»‡ thá»‘ng sáº½
          hiá»ƒn thá»‹ tiáº¿n bá»™ táº¡i Ä‘Ã¢y.
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
    <div className="rounded-2xl bg-black/[0.03] p-4 text-center dark:bg-white/5">
      <p className="text-xs font-bold text-[var(--BeaconVie-muted)]">{props.title}</p>
      <p
        className={`mt-2 text-2xl font-black ${
          props.positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-[var(--BeaconVie-primary)]'
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
    <section className="BeaconVie-card p-6">
      <h2 className="text-lg font-black text-[var(--BeaconVie-ink)]">
        KhÃ³a há»c AI Ä‘á» xuáº¥t cho báº¡n
      </h2>
      <div className="mt-4 grid gap-3">
        {props.courses.slice(0, 3).map((course) => (
          <button
            key={course.id}
            type="button"
            onClick={() => props.onSelect(course.slug)}
            className="flex gap-4 rounded-2xl border border-[var(--BeaconVie-border)] p-3 text-left hover:bg-blue-50 dark:hover:bg-white/8"
          >
            <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-xl bg-blue-50 dark:bg-white/8">
              {course.thumbnail ? (
                <Image
                  src={course.thumbnail}
                  alt={course.title}
                  fill
                  className="object-cover"
                />
              ) : (
                <BookOpen aria-hidden className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 text-[var(--BeaconVie-primary)]" />
              )}
            </div>
            <div>
              <p className="font-black text-[var(--BeaconVie-ink)]">{course.title}</p>
              <p className="mt-1 text-xs text-amber-500">
                â˜… {course.rating ?? 0}
                {course.reviews !== null ? ` (${course.reviews})` : ''}
              </p>
              <p className="mt-1 text-sm text-[var(--BeaconVie-muted)]">
                {course.lessonCount ?? 0} bÃ i há»c
              </p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

function RetakeDialog(props: {
  open: boolean;
  message: string;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <BeaconVieDialog open={props.open} onClose={props.onClose} titleId="dashboard-retake-title">
      <div className="flex items-start justify-between gap-4">
        <h2 id="dashboard-retake-title" className="text-2xl font-black text-[var(--BeaconVie-ink)]">
          LÃ m láº¡i Placement Test?
        </h2>
        <BeaconVieDialogCloseButton onClose={props.onClose} label="ÄÃ³ng há»™p thoáº¡i" />
      </div>
      <p className="mt-3 leading-7 text-[var(--BeaconVie-muted)]">
        {props.message}
      </p>
      <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
        Káº¿t quáº£ má»›i sáº½ Ä‘Æ°á»£c lÆ°u riÃªng vÃ  khÃ´ng xÃ³a lá»‹ch sá»­ cÅ©.
      </div>
      <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <BeaconVieButton tone="ghost" disabled={props.loading} onClick={props.onClose}>
          Quay láº¡i
        </BeaconVieButton>
        <BeaconVieButton loading={props.loading} onClick={props.onConfirm}>
          Váº«n lÃ m láº¡i
        </BeaconVieButton>
      </div>
    </BeaconVieDialog>
  );
}

function levelLabel(level: string) {
  const labels: Record<string, string> = {
    A1: 'SÆ¡ cáº¥p',
    A2: 'SÆ¡ trung cáº¥p',
    B1: 'Trung cáº¥p',
    B2: 'Trung cáº¥p cao',
    C1: 'Cao cáº¥p',
    C2: 'ThÃ nh tháº¡o',
  };
  return labels[level] ?? level;
}
