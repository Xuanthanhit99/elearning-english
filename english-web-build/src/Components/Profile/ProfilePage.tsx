"use client";

/* eslint-disable @next/next/no-img-element */

import {
  AtSign,
  Award,
  BookOpenCheck,
  CalendarDays,
  Camera,
  Edit3,
  Flame,
  Loader2,
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
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/src/lib/axios";
import { getApiErrorMessage } from "@/src/lib/api-error";
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

// Fields the backend allows to be explicitly cleared (no MinLength on the
// DTO) — an empty string here must still reach the server so "delete my
// bio" actually persists, instead of being silently dropped and leaving the
// old value in place. `fullname`/`username` intentionally keep the
// omit-when-empty behavior (they're required-ish fields with a MinLength on
// the backend that would reject an empty string anyway). `phone` also keeps
// it: the backend's `@IsPhoneNumber` validator rejects "", so clearing it
// needs a dedicated affordance, not just "send empty string".
const CLEARABLE_FIELDS: (keyof UpdateProfilePayload)[] = [
  "bio",
  "goal",
  "englishLevel",
  "learningGoal",
];

function cleanProfilePayload(form: UpdateProfilePayload) {
  const payload: Partial<UpdateProfilePayload> = {};

  (Object.keys(form) as Array<keyof UpdateProfilePayload>).forEach((key) => {
    const value = form[key];
    if (typeof value !== "string") return;
    const normalized = value.trim();
    if (normalized || CLEARABLE_FIELDS.includes(key)) {
      payload[key] = normalized;
    }
  });

  return payload;
}

type FieldErrors = Partial<Record<keyof UpdateProfilePayload, string>>;

const USERNAME_PATTERN = /^[a-zA-Z0-9_]+$/;
const VN_PHONE_PATTERN = /^(\+84|0)[0-9]{9,10}$/;

/** Validate phía client khớp với `UpdateProfileDto` (backend) — chỉ báo lỗi khi field có giá trị, vì mọi field ngoài `fullname` đều optional. */
function validateProfilePayload(payload: Partial<UpdateProfilePayload>, t: (key: string) => string): FieldErrors {
  const errors: FieldErrors = {};

  if (!payload.fullname || payload.fullname.length < 2) {
    errors.fullname = t("profile.validation.fullname");
  } else if (payload.fullname.length > 50) {
    errors.fullname = t("profile.validation.fullnameMax");
  }

  if (payload.username) {
    if (payload.username.length < 4 || payload.username.length > 30) {
      errors.username = t("profile.validation.usernameLength");
    } else if (!USERNAME_PATTERN.test(payload.username)) {
      errors.username = t("profile.validation.usernameFormat");
    }
  }

  if (payload.phone && !VN_PHONE_PATTERN.test(payload.phone)) {
    errors.phone = t("profile.validation.phone");
  }

  if (payload.bio && payload.bio.length > 160) {
    errors.bio = t("profile.validation.bioMax");
  }

  if (payload.goal && payload.goal.length > 120) {
    errors.goal = t("profile.validation.goalMax");
  }

  return errors;
}

/** Map message lỗi từ ValidationPipe backend (vd. "phone must be a valid phone number", "Username đã được sử dụng") về đúng field trong form. */
function mapBackendErrorsToFields(messages: string[]): FieldErrors {
  const fieldKeys: (keyof UpdateProfilePayload)[] = [
    "fullname",
    "username",
    "bio",
    "goal",
    "phone",
    "englishLevel",
    "learningGoal",
  ];
  const errors: FieldErrors = {};

  messages.forEach((message) => {
    const lower = message.toLowerCase();
    const field = fieldKeys.find((key) => lower.startsWith(key.toLowerCase()));
    if (field && !errors[field]) errors[field] = message;
  });

  return errors;
}

function getValidationMessages(error: unknown): string[] | null {
  const response = (error as { response?: { data?: { message?: unknown } } })?.response;
  const message = response?.data?.message;
  if (Array.isArray(message)) return message.filter((item): item is string => typeof item === "string");
  if (typeof message === "string") return [message];
  return null;
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
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [companionOpen, setCompanionOpen] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarPreviewOpen, setAvatarPreviewOpen] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
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
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
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
    setFieldErrors({});
    setEditing(true);
  }

  async function saveProfile() {
    if (saving) return; // chặn spam click submit

    const payload = cleanProfilePayload(form);
    const validationErrors = validateProfilePayload(payload, t);

    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      return;
    }

    setFieldErrors({});

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
      const messages = getValidationMessages(saveError);
      const backendFieldErrors = messages ? mapBackendErrorsToFields(messages) : {};

      if (Object.keys(backendFieldErrors).length > 0) {
        setFieldErrors(backendFieldErrors);
        setNotice(t("profile.validation.checkFields"));
      } else {
        setNotice(getApiErrorMessage(saveError, t("profile.saveError")));
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !profile) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setNotice(t("profile.avatarUploadError"));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setNotice(t("profile.avatarUploadError"));
      return;
    }

    const formData = new FormData();
    formData.append("avatar", file);

    try {
      setAvatarUploading(true);
      const response = await api.patch<ProfileUser>("/auth/me/avatar", formData);
      const updated = response.data;
      setProfile({ ...profile, avatar: updated.avatar });
      setAuthUser({ ...authUser, ...toAuthUser({ ...profile, avatar: updated.avatar }) });
      setNotice(t("profile.avatarUpdated"));
    } catch (uploadError) {
      console.error(uploadError);
      setNotice(t("profile.avatarUploadError"));
    } finally {
      setAvatarUploading(false);
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
            <div className="relative h-28 w-28 shrink-0">
              <button
                type="button"
                onClick={() => profile.avatar && setAvatarPreviewOpen(true)}
                disabled={!profile.avatar}
                aria-label={t("profile.viewAvatar")}
                title={profile.avatar ? t("profile.viewAvatar") : undefined}
                className="h-full w-full overflow-hidden rounded-[2rem] bg-white/16 ring-4 ring-white/20 transition disabled:cursor-default enabled:hover:brightness-90"
              >
                {profile.avatar ? (
                  <img src={profile.avatar} alt={profile.fullname} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-3xl font-black">
                    {initials(profile.fullname)}
                  </div>
                )}
              </button>

              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleAvatarSelected}
              />

              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={avatarUploading}
                aria-label={t("profile.changeAvatar")}
                title={t("profile.changeAvatar")}
                className="absolute -bottom-1.5 -right-1.5 flex h-9 w-9 items-center justify-center rounded-full bg-white text-[var(--lumiverse-primary-strong)] shadow-lg ring-4 ring-[var(--lumiverse-primary)]/20 transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {avatarUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              </button>
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
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--lumiverse-primary-soft)] text-[var(--lumiverse-primary)]">
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
                <div className="rounded-3xl bg-[var(--lumiverse-primary-soft)] p-5">
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
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--lumiverse-primary-soft)] text-[var(--lumiverse-primary)]">
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

      <LumiverseDialog
        open={editing}
        onClose={() => setEditing(false)}
        titleId="profile-edit-title"
        className="flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden"
      >
        <div className="-mx-7 -mt-7 flex items-start justify-between gap-4 border-b border-[var(--lumiverse-border)] px-7 pb-5 pt-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--lumiverse-primary-soft)] text-[var(--lumiverse-primary)]">
              <Edit3 className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 id="profile-edit-title" className="text-lg font-black leading-tight text-[var(--lumiverse-ink)] sm:text-xl">
                {t("profile.edit")}
              </h2>
              <p className="mt-0.5 text-xs font-semibold text-[var(--lumiverse-muted)]">
                {t("profile.editDescription")}
              </p>
            </div>
          </div>
          <LumiverseDialogCloseButton onClose={() => setEditing(false)} label={t("common.close")} />
        </div>

        <div className="-mx-7 min-h-0 flex-1 overflow-y-auto px-7 py-5">
          <FieldGroup icon={User} title={t("profile.groupBasic")}>
            <ProfileInput icon={User} label={t("profile.fullname")} value={form.fullname ?? ""} onChange={(value) => updateForm("fullname", value)} error={fieldErrors.fullname} maxLength={50} />
            <ProfileInput icon={AtSign} label={t("profile.username")} value={form.username ?? ""} onChange={(value) => updateForm("username", value)} error={fieldErrors.username} maxLength={30} placeholder="vd. minh_anh99" />
            <ProfileInput icon={Phone} label={t("profile.phone")} value={form.phone ?? ""} onChange={(value) => updateForm("phone", value)} error={fieldErrors.phone} placeholder="vd. 0912345678" />
            <ProfileInput icon={Trophy} label={t("profile.englishLevel")} value={form.englishLevel ?? ""} onChange={(value) => updateForm("englishLevel", value)} error={fieldErrors.englishLevel} />
            <ProfileInput className="sm:col-span-2" icon={Target} label={t("profile.learningGoal")} value={form.learningGoal ?? ""} onChange={(value) => updateForm("learningGoal", value)} error={fieldErrors.learningGoal} />
          </FieldGroup>

          <FieldGroup icon={Sparkles} title={t("profile.groupAbout")} className="mt-5 border-t border-[var(--lumiverse-border)] pt-5">
            <ProfileTextarea label={t("profile.bio")} value={form.bio ?? ""} onChange={(value) => updateForm("bio", value)} error={fieldErrors.bio} maxLength={160} />
            <ProfileTextarea label={t("profile.goal")} value={form.goal ?? ""} onChange={(value) => updateForm("goal", value)} error={fieldErrors.goal} maxLength={120} />
          </FieldGroup>
        </div>

        <div className="-mx-7 -mb-7 flex flex-col-reverse gap-3 border-t border-[var(--lumiverse-border)] px-7 pb-6 pt-4 sm:flex-row sm:justify-end">
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

      {avatarPreviewOpen && profile.avatar ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-[var(--lumiverse-overlay)] p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setAvatarPreviewOpen(false);
          }}
        >
          <div className="relative max-h-[85dvh] max-w-[min(90vw,32rem)]">
            <img
              src={profile.avatar}
              alt={profile.fullname}
              className="max-h-[85dvh] w-full rounded-[1.5rem] object-contain shadow-2xl"
            />
            <button
              type="button"
              onClick={() => setAvatarPreviewOpen(false)}
              aria-label={t("common.close")}
              className="absolute -top-3 -right-3 flex h-9 w-9 items-center justify-center rounded-full bg-white text-[var(--lumiverse-ink)] shadow-lg transition hover:scale-105"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}

      <LumiverseDialog open={companionOpen} onClose={() => setCompanionOpen(false)} titleId="profile-companion-title">
        <div className="flex items-start justify-between gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--lumiverse-primary-soft)] text-[var(--lumiverse-primary)]">
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

function FieldGroup({
  icon: Icon,
  title,
  className,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-[var(--lumiverse-primary)]">
        <Icon className="h-3.5 w-3.5" />
        {title}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
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
  icon: Icon,
  error,
  maxLength,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  icon?: React.ComponentType<{ className?: string }>;
  error?: string;
  maxLength?: number;
  placeholder?: string;
}) {
  return (
    <label className={className}>
      <span className="text-xs font-black text-[var(--lumiverse-muted)]">{label}</span>
      <div className="relative mt-1.5">
        {Icon ? (
          <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--lumiverse-muted)]" />
        ) : null}
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          maxLength={maxLength}
          placeholder={placeholder}
          aria-invalid={!!error}
          className={`lumiverse-input min-h-11 w-full font-bold outline-none ${Icon ? "pl-10 pr-4" : "px-4"} ${error ? "border-rose-400 focus:border-rose-400" : ""}`}
        />
      </div>
      {error ? <span className="mt-1.5 block text-xs font-bold text-rose-500">{error}</span> : null}
    </label>
  );
}

function ProfileTextarea({
  label,
  value,
  onChange,
  className,
  error,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  error?: string;
  maxLength?: number;
}) {
  return (
    <label className={className}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-black text-[var(--lumiverse-muted)]">{label}</span>
        {maxLength ? (
          <span className="text-[10px] font-bold text-[var(--lumiverse-muted)]">
            {value.length}/{maxLength}
          </span>
        ) : null}
      </div>
      <textarea
        value={value}
        rows={2}
        onChange={(event) => onChange(event.target.value)}
        maxLength={maxLength}
        aria-invalid={!!error}
        className={`lumiverse-input mt-1.5 w-full resize-none px-4 py-3 font-bold outline-none ${error ? "border-rose-400 focus:border-rose-400" : ""}`}
      />
      {error ? <span className="mt-1.5 block text-xs font-bold text-rose-500">{error}</span> : null}
    </label>
  );
}
