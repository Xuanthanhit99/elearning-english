'use client';

import {
  ArrowRight,
  Award,
  BarChart3,
  BookOpen,
  Bot,
  Check,
  ChevronRight,
  Clock3,
  FileBadge2,
  Gift,
  GraduationCap,
  Loader2,
  LockKeyhole,
  Sparkles,
  Target,
  Upload,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  CefrLevel,
  getPlacementHome,
  PlacementHomeData,
  selectManualLevel,
} from '@/src/lib/placement-api';

const levelDescriptions: Record<CefrLevel, string> = {
  A1: 'Mới bắt đầu',
  A2: 'Sơ cấp',
  B1: 'Trung cấp',
  B2: 'Trung cao cấp',
  C1: 'Nâng cao',
  C2: 'Thành thạo',
};

export default function PlacementLanding() {
  const router = useRouter();
  const [data, setData] = useState<PlacementHomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [showLevelModal, setShowLevelModal] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<CefrLevel>('A1');
  const [savingLevel, setSavingLevel] = useState(false);
  const [actionError, setActionError] = useState('');

  async function loadData() {
    try {
      setLoading(true);
      setLoadError('');
      const result = await getPlacementHome();
      setData(result);

      if (result.placement.overallLevel) {
        setSelectedLevel(result.placement.overallLevel);
      }
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : 'Không thể tải thông tin xếp trình độ.',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const certificateText = useMemo(
    () => data?.options.supportedCertificates.join(' • ') ?? '',
    [data],
  );

  async function handleConfirmManualLevel() {
    try {
      setSavingLevel(true);
      setActionError('');

      const result = await selectManualLevel(selectedLevel);
      setShowLevelModal(false);
      router.push(result.nextUrl);
      router.refresh();
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : 'Không thể lưu trình độ đã chọn.',
      );
    } finally {
      setSavingLevel(false);
    }
  }

  if (loading) {
    return <PlacementSkeleton />;
  }

  if (!data || loadError) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-7xl items-center justify-center px-4 py-10">
        <div className="w-full max-w-lg rounded-3xl border border-red-100 bg-white p-8 text-center shadow-sm">
          <p className="text-lg font-semibold text-slate-900">
            Không thể tải màn xếp trình độ
          </p>
          <p className="mt-2 text-sm text-slate-500">{loadError}</p>
          <button
            type="button"
            onClick={() => void loadData()}
            className="mt-6 rounded-xl bg-violet-600 px-5 py-3 font-semibold text-white transition hover:bg-violet-700"
          >
            Thử lại
          </button>
        </div>
      </main>
    );
  }

  return (
    <>
      <main className="relative overflow-hidden bg-[radial-gradient(circle_at_70%_10%,rgba(139,92,246,0.12),transparent_34%),linear-gradient(to_bottom,#ffffff,#fbfbff)]">
        <div className="mx-auto max-w-7xl px-4 pb-10 pt-10 sm:px-6 lg:px-8">
          <section className="grid items-center gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-violet-100 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-700">
                <Sparkles className="h-4 w-4" />
                Lộ trình cá nhân hóa
              </div>

              <h1 className="max-w-xl text-4xl font-black leading-tight tracking-tight text-slate-950 sm:text-5xl">
                Chào mừng trở lại,
                <span className="block bg-gradient-to-r from-violet-600 to-fuchsia-500 bg-clip-text text-transparent">
                  {data.user.name} 👋
                </span>
              </h1>

              <p className="mt-6 max-w-xl text-xl font-semibold leading-8 text-slate-800">
                Hãy xây dựng lộ trình học tiếng Anh dành riêng cho bạn.
              </p>

              <p className="mt-3 max-w-xl text-base leading-7 text-slate-500">
                Chọn một phương thức bên dưới để PoppyLingo xác định điểm bắt
                đầu phù hợp nhất.
              </p>
            </div>

            <div className="relative hidden min-h-[320px] items-center justify-center lg:flex">
              <div className="absolute h-72 w-72 rounded-full bg-violet-100/70 blur-3xl" />
              <div className="relative flex h-72 w-full max-w-xl items-center justify-center rounded-[40px] border border-violet-100 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 shadow-[0_20px_70px_rgba(124,58,237,0.12)]">
                <div className="absolute left-12 top-12 rotate-[-10deg] rounded-2xl bg-white p-4 shadow-lg">
                  <BookOpen className="h-10 w-10 text-violet-600" />
                </div>
                <div className="absolute right-14 top-10 rotate-12 rounded-2xl bg-white p-4 shadow-lg">
                  <Award className="h-10 w-10 text-amber-500" />
                </div>
                <div className="rounded-[32px] bg-gradient-to-br from-violet-600 to-fuchsia-500 p-8 text-white shadow-2xl">
                  <GraduationCap className="mx-auto h-20 w-20" />
                  <p className="mt-3 text-center text-lg font-black">
                    POPPYLINGO
                  </p>
                </div>
              </div>
            </div>
          </section>

          {data.placement.status === 'COMPLETED' &&
          data.placement.overallLevel ? (
            <section className="mt-8 rounded-3xl border border-emerald-100 bg-emerald-50/70 p-5 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-emerald-700">
                  Trình độ hiện tại
                </p>
                <p className="mt-1 text-2xl font-black text-slate-950">
                  {data.placement.overallLevel} ·{' '}
                  {levelDescriptions[data.placement.overallLevel]}
                </p>
              </div>

              <button
                type="button"
                onClick={() => router.push('/learning-path')}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white transition hover:bg-emerald-700 sm:mt-0 sm:w-auto"
              >
                Tiếp tục lộ trình
                <ArrowRight className="h-5 w-5" />
              </button>
            </section>
          ) : null}

          <section className="mt-8 grid gap-5 lg:grid-cols-3">
            <PlacementCard
              tone="violet"
              icon={<ClipboardIllustration />}
              title="Làm bài kiểm tra trình độ"
              badge="Được đề xuất"
              description="Hệ thống đánh giá năng lực hiện tại và xác định trình độ theo từng kỹ năng."
              features={[
                {
                  icon: <Clock3 className="h-5 w-5" />,
                  text: `Thời gian: ${data.options.testDurationMinutes.min} – ${data.options.testDurationMinutes.max} phút`,
                },
              ]}
              buttonText="Bắt đầu làm bài"
              onClick={() => router.push('/placement/test')}
            />

            <PlacementCard
              tone="blue"
              icon={<CertificateIllustration />}
              title="Tải lên chứng chỉ"
              description={`${certificateText}. Hệ thống sẽ đọc, kiểm tra và quy đổi sang CEFR.`}
              features={[
                {
                  icon: <Check className="h-5 w-5" />,
                  text: 'Hỗ trợ nhiều loại chứng chỉ',
                },
                {
                  icon: <LockKeyhole className="h-5 w-5" />,
                  text: 'Bảo mật thông tin tải lên',
                },
              ]}
              buttonText="Tải lên chứng chỉ"
              onClick={() => router.push('/placement/certificate')}
            />

            <PlacementCard
              tone="green"
              icon={<TargetIllustration />}
              title="Chọn trình độ của tôi"
              description="Bạn đã biết trình độ của mình? Chọn thủ công từ A1 đến C2 theo CEFR."
              features={[
                {
                  icon: <BarChart3 className="h-5 w-5" />,
                  text: 'Từ A1 đến C2 theo CEFR',
                },
                {
                  icon: <Target className="h-5 w-5" />,
                  text: 'Có thể đánh giá lại sau',
                },
              ]}
              buttonText="Chọn trình độ"
              onClick={() => {
                setActionError('');
                setShowLevelModal(true);
              }}
            />
          </section>

          <section className="mt-6 grid overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm sm:grid-cols-2 xl:grid-cols-4">
            <Benefit
              icon={<BookOpen className="h-7 w-7 text-violet-600" />}
              title="Lộ trình cá nhân hóa"
              text="Học đúng nội dung phù hợp với trình độ và mục tiêu."
            />
            <Benefit
              icon={<BarChart3 className="h-7 w-7 text-blue-600" />}
              title="Theo dõi tiến độ"
              text="Theo dõi sự tiến bộ và nhận báo cáo chi tiết."
            />
            <Benefit
              icon={<Bot className="h-7 w-7 text-amber-600" />}
              title="Hỗ trợ AI thông minh"
              text="Gợi ý và điều chỉnh lộ trình theo kết quả học."
            />
            <Benefit
              icon={<Gift className="h-7 w-7 text-pink-600" />}
              title="Học để nhận thưởng"
              text="Kiếm XP, mở khóa phần thưởng và thành tích."
              last
            />
          </section>
        </div>
      </main>

      {showLevelModal ? (
        <ManualLevelModal
          levels={data.options.cefrLevels}
          selectedLevel={selectedLevel}
          saving={savingLevel}
          error={actionError}
          onSelect={setSelectedLevel}
          onClose={() => !savingLevel && setShowLevelModal(false)}
          onConfirm={() => void handleConfirmManualLevel()}
        />
      ) : null}
    </>
  );
}

type PlacementCardProps = {
  tone: 'violet' | 'blue' | 'green';
  icon: React.ReactNode;
  title: string;
  badge?: string;
  description: string;
  features: Array<{
    icon: React.ReactNode;
    text: string;
  }>;
  buttonText: string;
  onClick: () => void;
};

function PlacementCard({
  tone,
  icon,
  title,
  badge,
  description,
  features,
  buttonText,
  onClick,
}: PlacementCardProps) {
  const toneClasses = {
    violet: {
      card: 'border-violet-100 bg-violet-50/35',
      badge: 'bg-violet-100 text-violet-700',
      feature: 'text-violet-700',
      button:
        'bg-gradient-to-r from-violet-700 to-fuchsia-600 hover:brightness-105',
    },
    blue: {
      card: 'border-blue-100 bg-blue-50/35',
      badge: 'bg-blue-100 text-blue-700',
      feature: 'text-blue-700',
      button: 'bg-gradient-to-r from-blue-600 to-cyan-500 hover:brightness-105',
    },
    green: {
      card: 'border-emerald-100 bg-emerald-50/35',
      badge: 'bg-emerald-100 text-emerald-700',
      feature: 'text-emerald-700',
      button:
        'bg-gradient-to-r from-emerald-600 to-green-500 hover:brightness-105',
    },
  }[tone];

  return (
    <article
      className={`flex min-h-[390px] flex-col rounded-3xl border p-6 shadow-[0_12px_38px_rgba(15,23,42,0.06)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_18px_50px_rgba(15,23,42,0.1)] ${toneClasses.card}`}
    >
      <div className="flex items-start gap-5">
        <div className="shrink-0">{icon}</div>
        <div>
          <h2 className="text-2xl font-black leading-tight text-slate-950">
            {title}
          </h2>

          {badge ? (
            <span
              className={`mt-3 inline-flex items-center gap-1 rounded-lg px-3 py-1 text-sm font-bold ${toneClasses.badge}`}
            >
              <Sparkles className="h-4 w-4" />
              {badge}
            </span>
          ) : null}

          <p className="mt-4 leading-7 text-slate-600">{description}</p>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {features.map((feature) => (
          <div
            key={feature.text}
            className={`flex items-center gap-3 font-medium ${toneClasses.feature}`}
          >
            {feature.icon}
            <span className="text-slate-700">{feature.text}</span>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onClick}
        className={`mt-auto inline-flex w-full items-center justify-center gap-3 rounded-xl px-5 py-3.5 text-lg font-black text-white shadow-lg transition ${toneClasses.button}`}
      >
        {buttonText}
        {tone === 'blue' ? (
          <Upload className="h-5 w-5" />
        ) : (
          <ArrowRight className="h-5 w-5" />
        )}
      </button>
    </article>
  );
}

function Benefit({
  icon,
  title,
  text,
  last = false,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  last?: boolean;
}) {
  return (
    <div
      className={`flex gap-4 p-6 ${
        last ? '' : 'border-b border-slate-100 sm:border-r xl:border-b-0'
      }`}
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-50">
        {icon}
      </div>
      <div>
        <h3 className="font-black text-slate-900">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-slate-500">{text}</p>
      </div>
    </div>
  );
}

function ManualLevelModal({
  levels,
  selectedLevel,
  saving,
  error,
  onSelect,
  onClose,
  onConfirm,
}: {
  levels: CefrLevel[];
  selectedLevel: CefrLevel;
  saving: boolean;
  error: string;
  onSelect: (level: CefrLevel) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-600">
              CEFR
            </p>
            <h2 className="mt-2 text-3xl font-black text-slate-950">
              Chọn trình độ của bạn
            </h2>
            <p className="mt-2 text-slate-500">
              Hệ thống sẽ dùng mức này làm điểm bắt đầu cho các kỹ năng.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
            aria-label="Đóng"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {levels.map((level) => {
            const active = selectedLevel === level;

            return (
              <button
                type="button"
                key={level}
                onClick={() => onSelect(level)}
                disabled={saving}
                className={`rounded-2xl border p-4 text-left transition ${
                  active
                    ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-100'
                    : 'border-slate-200 bg-white hover:border-emerald-200 hover:bg-emerald-50/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-black text-slate-950">
                    {level}
                  </span>
                  {active ? (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white">
                      <Check className="h-4 w-4" />
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  {levelDescriptions[level]}
                </p>
              </button>
            );
          })}
        </div>

        {error ? (
          <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
            {error}
          </p>
        ) : null}

        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl border border-slate-200 px-5 py-3 font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Quay lại
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Đang lưu
              </>
            ) : (
              <>
                Bắt đầu từ {selectedLevel}
                <ChevronRight className="h-5 w-5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function ClipboardIllustration() {
  return (
    <div className="flex h-32 w-32 items-center justify-center rounded-[30px] bg-violet-100">
      <div className="relative rounded-2xl bg-gradient-to-b from-violet-500 to-violet-700 p-5 text-white shadow-xl">
        <FileBadge2 className="h-16 w-16" />
        <div className="absolute -bottom-4 -right-4 rounded-full border-4 border-white bg-white p-2 shadow-lg">
          <Clock3 className="h-8 w-8 text-violet-600" />
        </div>
      </div>
    </div>
  );
}

function CertificateIllustration() {
  return (
    <div className="flex h-32 w-32 items-center justify-center rounded-[30px] bg-blue-100">
      <div className="relative rounded-xl bg-white p-5 shadow-xl">
        <GraduationCap className="h-16 w-16 text-blue-600" />
        <div className="absolute -bottom-3 -right-3 rounded-full border-4 border-white bg-blue-600 p-2 text-white">
          <Award className="h-7 w-7" />
        </div>
      </div>
    </div>
  );
}

function TargetIllustration() {
  return (
    <div className="flex h-32 w-32 items-center justify-center rounded-[30px] bg-emerald-100">
      <div className="rounded-full bg-gradient-to-br from-emerald-400 to-green-600 p-5 text-white shadow-xl">
        <Target className="h-20 w-20" />
      </div>
    </div>
  );
}

function PlacementSkeleton() {
  return (
    <main className="mx-auto max-w-7xl animate-pulse px-4 py-10 sm:px-6 lg:px-8">
      <div className="h-10 w-72 rounded-xl bg-slate-200" />
      <div className="mt-4 h-7 w-96 max-w-full rounded-xl bg-slate-100" />
      <div className="mt-10 grid gap-5 lg:grid-cols-3">
        {[1, 2, 3].map((item) => (
          <div
            key={item}
            className="h-[390px] rounded-3xl border border-slate-100 bg-white p-6 shadow-sm"
          >
            <div className="h-28 w-28 rounded-3xl bg-slate-100" />
            <div className="mt-5 h-7 w-3/4 rounded-lg bg-slate-200" />
            <div className="mt-4 h-4 w-full rounded-lg bg-slate-100" />
            <div className="mt-2 h-4 w-5/6 rounded-lg bg-slate-100" />
            <div className="mt-20 h-12 rounded-xl bg-slate-200" />
          </div>
        ))}
      </div>
    </main>
  );
}
