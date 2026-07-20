"use client";

/* eslint-disable @next/next/no-img-element */

import {
  Award,
  BookOpenCheck,
  CalendarDays,
  Edit3,
  Flame,
  Mail,
  PawPrint,
  Phone,
  Save,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  User,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/src/lib/axios";
import { DashboardData, getDashboard } from "@/src/lib/dashboard-api";
import { useTranslation } from "@/src/hooks/useTranslation";
import { useAuthStore } from "@/src/store/authStore";
import {
  LumiverseBadge,
  LumiverseButton,
  LumiverseCard,
  LumiverseDialog,
  LumiverseDialogCloseButton,
  LumiverseProgress,
  LumiverseSectionHeader,
  LumiverseSkeleton,
  LumiverseState,
  LumiverseStatCard,
} from "@/src/Components/UI/Lumiverse";

type ProfileUser = {
  id: string;
  fullname: string;
  email: string;
  avatar?: string | null;
  username?: string | null;
  bio?: string | null;
  goal?: string | null;
  interests?: string[];
  phone?: string | null;
  level?: number | null;
  xp?: number | null;
  isPro?: boolean;
  role?: string | null;
  englishLevel?: string | null;
  learningGoal?: string | null;
  createAt?: string | null;
};

type AchievementOverview = {
  summary?: {
    totalAchievements?: number;
    xpEarned?: number;
    completedChallenges?: number;
    longestStreak?: number;
  };
  recent?: Array<{
    key: string;
    title: string;
    description: string;
    icon?: string | null;
    xp?: number;
    dateLabel?: string;
  }>;
  goals?: Array<{
    key: string;
    title: string;
    subtitle?: string;
    progressPercent: number;
    locked?: boolean;
    unlocked?: boolean;
    claimed?: boolean;
  }>;
};

type UpdateProfilePayload = Pick<
  ProfileUser,
  "fullname" | "username" | "bio" | "goal" | "phone" | "englishLevel" | "learningGoal"
>;

const localeMap: Record<string, string> = {
  vi: "vi-VN",
  en: "en-US",
  zh: "zh-CN",
  de: "de-DE",
};

function formatDate(value: string | null | undefined, locale: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(localeMap[locale] ?? "vi-VN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function initials(name?: string | null) {
  return (name || "Lumiverse")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function normalizeUser(response: unknown): ProfileUser {
  const data = response as {
    data?: { data?: { getUser?: ProfileUser }; getUser?: ProfileUser };
    getUser?: ProfileUser;
  };
  return data.data?.data?.getUser ?? data.data?.getUser ?? data.getUser ?? (response as ProfileUser);
}

function toAuthUser(user: ProfileUser) {
  return {
    id: user.id,
    fullname: user.fullname,
    email: user.email,
    avatar: user.avatar ?? undefined,
    role: user.role ?? "STUDENT",
  };
}

function cleanProfilePayload(form: UpdateProfilePayload) {
  const payload: Partial<UpdateProfilePayload> = {};

  (Object.keys(form) as Array<keyof UpdateProfilePayload>).forEach((key) => {
    const value = form[key];
    if (typeof value !== "string") return;
    const normalized = value.trim();
    if (normalized) payload[key] = normalized;
  });

  return payload;
}

function ProfileSkeleton() {
  return (
    <div className="space-y-6 pb-10">
      <LumiverseSkeleton className="h-64 rounded-[2rem]" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <LumiverseSkeleton key={index} className="h-36 rounded-3xl" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <LumiverseSkeleton className="h-96 rounded-3xl" />
        <LumiverseSkeleton className="h-96 rounded-3xl" />
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { t, locale } = useTranslation();
  const authUser = useAuthStore((state) => state.user);
  const setAuthUser = useAuthStore((state) => state.setUser);
  const [profile, setProfile] = useState<ProfileUser | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [achievementOverview, setAchievementOverview] = useState<AchievementOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [companionOpen, setCompanionOpen] = useState(false);
  const [form, setForm] = useState<UpdateProfilePayload>({
    fullname: "",
    username: "",
    bio: "",
    goal: "",
    phone: "",
    englishLevel: "",
    learningGoal: "",
  });

  async function loadProfile() {
    setLoading(true);
    setError(false);
    try {
      const [me, dashboardData, achievements] = await Promise.allSettled([
        api.get("/auth/me"),
        getDashboard(),
        api.get<AchievementOverview>("/achievements/overview"),
      ]);

      if (me.status !== "fulfilled") throw me.reason;

      const currentProfile = normalizeUser(me.value);
      setProfile(currentProfile);
      setAuthUser({ ...authUser, ...toAuthUser(currentProfile) });

      if (dashboardData.status === "fulfilled") {
        setDashboard(dashboardData.value);
      }

      if (achievements.status === "fulfilled") {
        setAchievementOverview(achievements.value.data);
      }
    } catch (loadError) {
      console.error(loadError);
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    async function run() {
      setLoading(true);
      setError(false);
      try {
        const [me, dashboardData, achievements] = await Promise.allSettled([
          api.get("/auth/me"),
          getDashboard(),
          api.get<AchievementOverview>("/achievements/overview"),
        ]);

        if (!active) return;
        if (me.status !== "fulfilled") throw me.reason;

        const currentProfile = normalizeUser(me.value);
        setProfile(currentProfile);
        setAuthUser({ ...authUser, ...toAuthUser(currentProfile) });

        if (dashboardData.status === "fulfilled") {
          setDashboard(dashboardData.value);
        }

        if (achievements.status === "fulfilled") {
          setAchievementOverview(achievements.value.data);
        }
      } catch (loadError) {
        if (!active) return;
        console.error(loadError);
        setError(true);
      } finally {
        if (active) setLoading(false);
      }
    }

    void run();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setAuthUser]);

  const joinedAt = formatDate(profile?.createAt, locale);
  const level = dashboard?.xp.level ?? profile?.level ?? 1;
  const totalXp = dashboard?.xp.total ?? profile?.xp ?? 0;
  const currentStreak = dashboard?.currentStreak ?? 0;
  const completedLessons = dashboard?.analytics?.summary.completedLessons ?? dashboard?.today?.completedLessons ?? 0;
  const studyMinutes = dashboard?.analytics?.summary.studyTimeMinutes ?? dashboard?.week?.studyMinutes ?? 0;
  const placementLevel = dashboard?.learningPath?.overallLevel ?? profile?.englishLevel ?? null;
  const learningProgress = dashboard?.learningPath?.progressPercent ?? 0;
  const skillBreakdown = dashboard?.analytics?.skillBreakdown;
  const achievementRecent = achievementOverview?.recent ?? dashboard?.recentAchievements ?? [];
  const achievementGoals = achievementOverview?.goals ?? [];

  const personalRows = useMemo(
    () =>
      [
        { icon: Mail, label: t("profile.email"), value: profile?.email },
        { icon: User, label: t("profile.username"), value: profile?.username ? `@${profile.username}` : null },
        { icon: Phone, label: t("profile.phone"), value: profile?.phone },
        { icon: Target, label: t("profile.learningGoal"), value: profile?.learningGoal ?? profile?.goal },
        { icon: Trophy, label: t("profile.level"), value: placementLevel },
        { icon: ShieldCheck, label: t("profile.role"), value: profile?.role },
        { icon: CalendarDays, label: t("profile.joinedAt"), value: joinedAt },
      ].filter((item) => item.value),
    [joinedAt, placementLevel, profile, t],
  );

  function updateForm(field: keyof UpdateProfilePayload, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function startEditing() {
    if (profile) {
      setForm({
        fullname: profile.fullname ?? "",
        username: profile.username ?? "",
        bio: profile.bio ?? "",
        goal: profile.goal ?? "",
        phone: profile.phone ?? "",
        englishLevel: profile.englishLevel ?? "",
        learningGoal: profile.learningGoal ?? "",
      });
    }
    setEditing(true);
  }

  async function saveProfile() {
    const payload = cleanProfilePayload(form);
    if (!payload.fullname || payload.fullname.length < 2) {
      setNotice(t("profile.validation.fullname"));
      return;
    }

    try {
      setSaving(true);
      const response = await api.patch<ProfileUser>("/auth/me/profile", payload);
      const updated = response.data;
      setProfile(updated);
      setAuthUser({ ...authUser, ...toAuthUser(updated) });
      setEditing(false);
      setNotice(t("profile.saveSuccess"));
    } catch (saveError) {
      console.error(saveError);
      setNotice(t("profile.saveError"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <ProfileSkeleton />;

  if (error || !profile) {
    return (
      <LumiverseState
        title={t("profile.loadError")}
        description={t("profile.loadErrorDescription")}
        actionLabel={t("profile.retry")}
        onAction={loadProfile}
        tone="error"
      />
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <section className="lumiverse-gradient overflow-hidden rounded-[2rem] p-5 text-white shadow-[0_28px_80px_rgba(23,70,255,0.22)] sm:p-7">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-[2rem] bg-white/16 ring-4 ring-white/20">
              {profile.avatar ? (
                <img src={profile.avatar} alt={profile.fullname} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-3xl font-black">
                  {initials(profile.fullname)}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <LumiverseBadge className="border-white/20 bg-white/12 text-white">
                {t("profile.badge")}
              </LumiverseBadge>
              <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">
                {profile.fullname}
              </h1>
              <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-white/80 sm:text-base">
                {profile.bio || profile.goal || t("profile.subtitle")}
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-sm font-black text-white/86">
                <span className="rounded-full bg-white/14 px-3 py-1">{profile.email}</span>
                {profile.username ? <span className="rounded-full bg-white/14 px-3 py-1">@{profile.username}</span> : null}
                {joinedAt ? <span className="rounded-full bg-white/14 px-3 py-1">{t("profile.joinedPrefix")} {joinedAt}</span> : null}
              </div>
            </div>
          </div>

          <LumiverseButton className="bg-white text-[var(--lumiverse-primary-strong)] hover:bg-white" onClick={startEditing}>
            <Edit3 aria-hidden className="h-4 w-4" />
            {t("profile.edit")}
          </LumiverseButton>
        </div>
      </section>

      <section aria-label={t("profile.quickStats")} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <LumiverseStatCard icon={<Zap className="h-5 w-5" />} label={t("profile.totalXp")} value={totalXp.toLocaleString(localeMap[locale] ?? "vi-VN")} />
        <LumiverseStatCard icon={<Trophy className="h-5 w-5" />} label={t("profile.level")} value={level} detail={placementLevel ?? undefined} />
        <LumiverseStatCard icon={<Flame className="h-5 w-5" />} label={t("profile.streak")} value={currentStreak} detail={t("profile.days")} />
        <LumiverseStatCard icon={<BookOpenCheck className="h-5 w-5" />} label={t("profile.completedLessons")} value={completedLessons} detail={`${studyMinutes} ${t("profile.minutes")}`} />
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <LumiverseCard className="p-5">
            <LumiverseSectionHeader title={t("profile.personalInformation")} description={t("profile.personalInformationDescription")} />
            {personalRows.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {personalRows.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="rounded-2xl border border-[var(--lumiverse-border)] bg-white/54 p-4 dark:bg-white/6">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[var(--lumiverse-primary)] dark:bg-white/8">
                          <Icon className="h-5 w-5" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-xs font-black uppercase tracking-[0.12em] text-[var(--lumiverse-muted)]">{item.label}</span>
                          <span className="block truncate font-black text-[var(--lumiverse-ink)]">{item.value}</span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <LumiverseState title={t("profile.noPersonalInfo")} tone="empty" />
            )}
          </LumiverseCard>

          <LumiverseCard className="p-5">
            <LumiverseSectionHeader title={t("profile.learningProgress")} description={t("profile.learningProgressDescription")} />
            {dashboard ? (
              <div className="space-y-5">
                <div className="rounded-3xl bg-blue-50/70 p-5 dark:bg-white/8">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--lumiverse-primary)]">
                        {t("profile.learningPath")}
                      </p>
                      <h2 className="mt-1 text-2xl font-black text-[var(--lumiverse-ink)]">
                        {dashboard.learningPath?.currentPhase?.title ?? t("profile.notDetermined")}
                      </h2>
                    </div>
                    <span className="text-2xl font-black text-[var(--lumiverse-primary)]">{learningProgress}%</span>
                  </div>
                  <LumiverseProgress value={learningProgress} className="mt-4" />
                </div>

                {dashboard.skillProgress.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {dashboard.skillProgress.map((skill) => (
                      <div key={skill.key} className="rounded-2xl border border-[var(--lumiverse-border)] bg-white/54 p-4 dark:bg-white/6">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <span className="font-black text-[var(--lumiverse-ink)]">{skill.label}</span>
                          <span className="text-sm font-black text-[var(--lumiverse-primary)]">{skill.percent}%</span>
                        </div>
                        <LumiverseProgress value={skill.percent} className="h-2" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <LumiverseState title={t("profile.noSkillProgress")} description={t("profile.noSkillProgressDescription")} tone="empty" />
                )}

                {skillBreakdown ? (
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    <MiniMetric label={t("profile.wordsLearned")} value={skillBreakdown.vocabulary.learned} />
                    <MiniMetric label={t("profile.listeningCompleted")} value={skillBreakdown.listening.completed} />
                    <MiniMetric label={t("profile.speakingCompleted")} value={skillBreakdown.speaking.completed} />
                    <MiniMetric label={t("profile.readingCompleted")} value={skillBreakdown.reading.completed} />
                    <MiniMetric label={t("profile.writingCompleted")} value={skillBreakdown.writing.completed} />
                    <MiniMetric label={t("profile.grammarCompleted")} value={skillBreakdown.grammar.completed} />
                  </div>
                ) : null}
              </div>
            ) : (
              <LumiverseState title={t("profile.noLearningStats")} description={t("profile.noLearningStatsDescription")} tone="empty" />
            )}
          </LumiverseCard>
        </div>

        <aside className="space-y-6">
          <button type="button" className="block w-full text-left" onClick={() => setCompanionOpen(true)}>
            <LumiverseCard className="p-5 transition hover:-translate-y-0.5 hover:border-blue-200">
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[var(--lumiverse-primary)] dark:bg-white/8">
                  <PawPrint className="h-7 w-7" />
                </div>
                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-amber-700 dark:bg-amber-400/12 dark:text-amber-200">
                  {t("profile.companion.badge")}
                </span>
              </div>
              <h2 className="mt-5 text-2xl font-black text-[var(--lumiverse-ink)]">
                {t("profile.companion.title")}
              </h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-[var(--lumiverse-muted)]">
                {t("profile.companion.description")}
              </p>
              <span className="lumiverse-button-soft mt-5 w-full">
                <Sparkles className="h-4 w-4" />
                {t("profile.companion.viewInformation")}
              </span>
            </LumiverseCard>
          </button>

          <LumiverseCard className="p-5">
            <LumiverseSectionHeader title={t("profile.achievements")} description={t("profile.achievementsDescription")} />
            {achievementRecent.length > 0 ? (
              <div className="space-y-3">
                {achievementRecent.slice(0, 4).map((item) => (
                  <div key={"key" in item ? item.key : item.id} className="rounded-2xl border border-[var(--lumiverse-border)] bg-white/54 p-4 dark:bg-white/6">
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-white/8">
                        <Award className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-black text-[var(--lumiverse-ink)]">{item.title}</p>
                        <p className="mt-1 line-clamp-2 text-xs font-bold text-[var(--lumiverse-muted)]">{item.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : achievementGoals.length > 0 ? (
              <div className="space-y-3">
                {achievementGoals.slice(0, 4).map((goal) => (
                  <div key={goal.key} className="rounded-2xl border border-[var(--lumiverse-border)] bg-white/54 p-4 dark:bg-white/6">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="truncate font-black text-[var(--lumiverse-ink)]">{goal.title}</p>
                      <span className="text-sm font-black text-[var(--lumiverse-primary)]">{goal.progressPercent}%</span>
                    </div>
                    <LumiverseProgress value={goal.progressPercent} className="h-2" />
                  </div>
                ))}
              </div>
            ) : (
              <LumiverseState title={t("profile.noAchievements")} description={t("profile.noAchievementsDescription")} tone="empty" />
            )}
          </LumiverseCard>
        </aside>
      </div>

      <LumiverseDialog open={editing} onClose={() => setEditing(false)} titleId="profile-edit-title" className="max-h-[90dvh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="profile-edit-title" className="text-2xl font-black text-[var(--lumiverse-ink)]">
              {t("profile.edit")}
            </h2>
            <p className="mt-1 text-sm font-semibold text-[var(--lumiverse-muted)]">
              {t("profile.editDescription")}
            </p>
          </div>
          <LumiverseDialogCloseButton onClose={() => setEditing(false)} label={t("common.close")} />
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <ProfileInput label={t("profile.fullname")} value={form.fullname ?? ""} onChange={(value) => updateForm("fullname", value)} />
          <ProfileInput label={t("profile.username")} value={form.username ?? ""} onChange={(value) => updateForm("username", value)} />
          <ProfileInput label={t("profile.phone")} value={form.phone ?? ""} onChange={(value) => updateForm("phone", value)} />
          <ProfileInput label={t("profile.englishLevel")} value={form.englishLevel ?? ""} onChange={(value) => updateForm("englishLevel", value)} />
          <ProfileInput className="sm:col-span-2" label={t("profile.learningGoal")} value={form.learningGoal ?? ""} onChange={(value) => updateForm("learningGoal", value)} />
          <ProfileTextarea className="sm:col-span-2" label={t("profile.bio")} value={form.bio ?? ""} onChange={(value) => updateForm("bio", value)} />
          <ProfileTextarea className="sm:col-span-2" label={t("profile.goal")} value={form.goal ?? ""} onChange={(value) => updateForm("goal", value)} />
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <LumiverseButton type="button" tone="soft" onClick={() => setEditing(false)}>
            <X className="h-4 w-4" />
            {t("common.cancel")}
          </LumiverseButton>
          <LumiverseButton type="button" loading={saving} onClick={saveProfile}>
            <Save className="h-4 w-4" />
            {saving ? t("common.saving") : t("common.save")}
          </LumiverseButton>
        </div>
      </LumiverseDialog>

      <LumiverseDialog open={companionOpen} onClose={() => setCompanionOpen(false)} titleId="profile-companion-title">
        <div className="flex items-start justify-between gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[var(--lumiverse-primary)] dark:bg-white/8">
            <PawPrint className="h-6 w-6" />
          </div>
          <LumiverseDialogCloseButton onClose={() => setCompanionOpen(false)} label={t("common.close")} />
        </div>
        <h2 id="profile-companion-title" className="mt-5 text-2xl font-black text-[var(--lumiverse-ink)]">
          {t("profile.companion.modalTitle")}
        </h2>
        <p className="mt-3 text-sm font-semibold leading-7 text-[var(--lumiverse-muted)]">
          {t("profile.companion.modalDescription")}
        </p>
        <LumiverseButton className="mt-6 w-full" onClick={() => setCompanionOpen(false)}>
          {t("profile.companion.confirm")}
        </LumiverseButton>
      </LumiverseDialog>

      {notice ? (
        <div className="fixed bottom-6 left-1/2 z-50 max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-2xl bg-[var(--lumiverse-ink)] px-5 py-3 text-sm font-black text-[var(--background)] shadow-2xl">
          {notice}
          <button type="button" className="ml-4 underline" onClick={() => setNotice(null)}>
            {t("common.close")}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-[var(--lumiverse-border)] bg-white/54 p-4 dark:bg-white/6">
      <p className="text-2xl font-black text-[var(--lumiverse-ink)]">{value}</p>
      <p className="mt-1 text-sm font-bold text-[var(--lumiverse-muted)]">{label}</p>
    </div>
  );
}

function ProfileInput({
  label,
  value,
  onChange,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <label className={className}>
      <span className="text-sm font-black text-[var(--lumiverse-muted)]">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="lumiverse-input mt-2 min-h-12 w-full px-4 font-bold outline-none"
      />
    </label>
  );
}

function ProfileTextarea({
  label,
  value,
  onChange,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <label className={className}>
      <span className="text-sm font-black text-[var(--lumiverse-muted)]">{label}</span>
      <textarea
        value={value}
        rows={3}
        onChange={(event) => onChange(event.target.value)}
        className="lumiverse-input mt-2 w-full resize-none px-4 py-3 font-bold outline-none"
      />
    </label>
  );
}
