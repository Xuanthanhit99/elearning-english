'use client';

import {
  Award,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ImageIcon,
  Loader2,
  Plus,
  Sparkles,
  Target,
  Trophy,
  Upload,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  createCommunityChallenge,
  getCommunityChallenges,
  joinCommunityChallenge,
  updateCommunityChallengeProgress,
  uploadCommunityFile,
} from '@/src/lib/community-social-api';
import type { CommunityChallengeItem } from '@/src/types/community-social';

type ChallengeType =
  | 'SPEAKING'
  | 'VOCABULARY'
  | 'LISTENING'
  | 'READING'
  | 'WRITING'
  | 'GRAMMAR'
  | 'MIXED'
  | 'OTHER';

type AudienceType =
  | 'ALL_MEMBERS'
  | 'NEW_MEMBERS'
  | 'A1_A2'
  | 'B1_PLUS';

type BadgeType = 'BRONZE' | 'SILVER' | 'GOLD' | 'DIAMOND';

type ChallengeForm = {
  title: string;
  description: string;
  challengeType: ChallengeType;
  target: number;
  unit: string;
  rewardXp: number;
  startsAt: string;
  endsAt: string;
  audience: AudienceType;
  maxParticipants: string;
  badge: BadgeType;
  coverUrl: string;
};

const initialForm: ChallengeForm = {
  title: '',
  description: '',
  challengeType: 'SPEAKING',
  target: 30,
  unit: 'ngÃ y',
  rewardXp: 500,
  startsAt: '',
  endsAt: '',
  audience: 'ALL_MEMBERS',
  maxParticipants: '',
  badge: 'GOLD',
  coverUrl: '',
};

const challengeTypeOptions: Array<{
  value: ChallengeType;
  label: string;
}> = [
  { value: 'SPEAKING', label: 'Speaking' },
  { value: 'VOCABULARY', label: 'Vocabulary' },
  { value: 'LISTENING', label: 'Listening' },
  { value: 'READING', label: 'Reading' },
  { value: 'WRITING', label: 'Writing' },
  { value: 'GRAMMAR', label: 'Grammar' },
  { value: 'MIXED', label: 'Tá»•ng há»£p' },
  { value: 'OTHER', label: 'KhÃ¡c' },
];

const unitOptions = [
  'ngÃ y',
  'tá»«',
  'bÃ i',
  'phÃºt',
  'giá»',
  'láº§n',
  'Ä‘iá»ƒm XP',
];

const badgeLabel: Record<BadgeType, string> = {
  BRONZE: 'Huy hiá»‡u Äá»“ng',
  SILVER: 'Huy hiá»‡u Báº¡c',
  GOLD: 'Huy hiá»‡u VÃ ng',
  DIAMOND: 'Huy hiá»‡u Kim cÆ°Æ¡ng',
};

const audienceLabel: Record<AudienceType, string> = {
  ALL_MEMBERS: 'Má»i thÃ nh viÃªn',
  NEW_MEMBERS: 'Chá»‰ thÃ nh viÃªn má»›i',
  A1_A2: 'Chá»‰ trÃ¬nh Ä‘á»™ A1â€“A2',
  B1_PLUS: 'Chá»‰ trÃ¬nh Ä‘á»™ B1 trá»Ÿ lÃªn',
};

function FieldLabel({
  label,
  required,
  description,
}: {
  label: string;
  required?: boolean;
  description?: string;
}) {
  return (
    <div className="mb-2">
      <label className="block text-sm font-extrabold text-slate-800">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      {description && (
        <p className="mt-1 text-xs leading-5 text-slate-500">
          {description}
        </p>
      )}
    </div>
  );
}

function ValidationError({ message }: { message?: string }) {
  if (!message) return null;

  return (
    <p className="mt-1.5 text-xs font-semibold text-red-600">
      {message}
    </p>
  );
}

function ChallengePreview({ form }: { form: ChallengeForm }) {
  const formattedStart = form.startsAt
    ? new Date(form.startsAt).toLocaleString('vi-VN')
    : 'ChÆ°a chá»n';

  const formattedEnd = form.endsAt
    ? new Date(form.endsAt).toLocaleString('vi-VN')
    : 'ChÆ°a chá»n';

  return (
    <aside className="sticky top-5 rounded-3xl border-2 border-indigo-200 bg-white p-5 shadow-md">
      <div className="flex items-center gap-2">
        <Sparkles size={19} className="text-indigo-600" />
        <h3 className="font-extrabold text-slate-950">
          Xem trÆ°á»›c thá»­ thÃ¡ch
        </h3>
      </div>

      <div className="mt-4 overflow-hidden rounded-3xl border-2 border-slate-200 bg-white">
        <div className="relative h-36 bg-gradient-to-br from-indigo-600 to-violet-700">
          {form.coverUrl ? (
            <img
              src={form.coverUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center text-white/70">
              <ImageIcon size={34} />
            </div>
          )}

          <span className="absolute left-3 top-3 rounded-full bg-slate-950/70 px-3 py-1 text-xs font-bold text-white backdrop-blur">
            {
              challengeTypeOptions.find(
                (item) => item.value === form.challengeType,
              )?.label
            }
          </span>
        </div>

        <div className="p-5">
          <h4 className="text-lg font-extrabold text-slate-950">
            {form.title || 'TÃªn thá»­ thÃ¡ch sáº½ hiá»ƒn thá»‹ táº¡i Ä‘Ã¢y'}
          </h4>

          <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">
            {form.description ||
              'MÃ´ táº£ má»¥c tiÃªu vÃ  cÃ¡ch hoÃ n thÃ nh thá»­ thÃ¡ch.'}
          </p>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <div className="rounded-2xl bg-indigo-50 p-3">
              <div className="flex items-center gap-2 text-indigo-700">
                <Target size={16} />
                <span className="text-xs font-bold uppercase">
                  Má»¥c tiÃªu
                </span>
              </div>
              <strong className="mt-2 block text-slate-950">
                {form.target || 0} {form.unit}
              </strong>
            </div>

            <div className="rounded-2xl bg-amber-50 p-3">
              <div className="flex items-center gap-2 text-amber-700">
                <Zap size={16} />
                <span className="text-xs font-bold uppercase">
                  Pháº§n thÆ°á»Ÿng
                </span>
              </div>
              <strong className="mt-2 block text-slate-950">
                {form.rewardXp || 0} XP
              </strong>
            </div>
          </div>

          <div className="mt-4 space-y-2 text-xs font-semibold text-slate-600">
            <div className="flex items-center gap-2">
              <CalendarDays size={14} />
              Báº¯t Ä‘áº§u: {formattedStart}
            </div>
            <div className="flex items-center gap-2">
              <Clock3 size={14} />
              Káº¿t thÃºc: {formattedEnd}
            </div>
            <div className="flex items-center gap-2">
              <Users size={14} />
              {audienceLabel[form.audience]}
            </div>
            <div className="flex items-center gap-2">
              <Award size={14} />
              {badgeLabel[form.badge]}
            </div>
          </div>

          <button
            type="button"
            disabled
            className="mt-5 w-full rounded-xl bg-indigo-600 py-3 font-bold text-white opacity-70"
          >
            Tham gia thá»­ thÃ¡ch
          </button>
        </div>
      </div>
    </aside>
  );
}

export function CommunityClubChallenges({
  clubId,
  canManage,
  joined,
}: {
  clubId: string;
  canManage: boolean;
  joined: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  const [items, setItems] = useState<CommunityChallengeItem[]>([]);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<ChallengeForm>(initialForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof ChallengeForm, string>>
  >({});

  async function load() {
    try {
      setLoading(true);
      setError('');

      const data = await getCommunityChallenges();

      setItems(
        data.filter(
          (item) =>
            (
              item as CommunityChallengeItem & {
                clubId?: string | null;
              }
            ).clubId === clubId,
        ),
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'KhÃ´ng thá»ƒ táº£i danh sÃ¡ch thá»­ thÃ¡ch',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [clubId]);

  const formValid = useMemo(() => {
    return (
      form.title.trim().length >= 5 &&
      form.description.trim().length >= 10 &&
      form.target > 0 &&
      form.rewardXp >= 0 &&
      Boolean(form.startsAt) &&
      Boolean(form.endsAt) &&
      new Date(form.endsAt) > new Date(form.startsAt)
    );
  }, [form]);

  function validateForm() {
    const errors: Partial<Record<keyof ChallengeForm, string>> = {};

    if (form.title.trim().length < 5) {
      errors.title = 'TÃªn thá»­ thÃ¡ch cáº§n Ã­t nháº¥t 5 kÃ½ tá»±.';
    }

    if (form.description.trim().length < 10) {
      errors.description = 'MÃ´ táº£ cáº§n Ã­t nháº¥t 10 kÃ½ tá»±.';
    }

    if (!Number.isFinite(form.target) || form.target <= 0) {
      errors.target = 'Má»¥c tiÃªu pháº£i lá»›n hÆ¡n 0.';
    }

    if (!Number.isFinite(form.rewardXp) || form.rewardXp < 0) {
      errors.rewardXp = 'XP thÆ°á»Ÿng khÃ´ng Ä‘Æ°á»£c nhá» hÆ¡n 0.';
    }

    if (!form.startsAt) {
      errors.startsAt = 'Vui lÃ²ng chá»n thá»i gian báº¯t Ä‘áº§u.';
    }

    if (!form.endsAt) {
      errors.endsAt = 'Vui lÃ²ng chá»n thá»i gian káº¿t thÃºc.';
    }

    if (
      form.startsAt &&
      form.endsAt &&
      new Date(form.endsAt) <= new Date(form.startsAt)
    ) {
      errors.endsAt = 'Thá»i gian káº¿t thÃºc pháº£i sau thá»i gian báº¯t Ä‘áº§u.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function uploadCover(file: File) {
    try {
      setUploadingCover(true);
      setError('');

      const uploaded = await uploadCommunityFile(file);

      if (uploaded.type !== 'IMAGE') {
        throw new Error('Vui lÃ²ng chá»n Ä‘Ãºng Ä‘á»‹nh dáº¡ng áº£nh.');
      }

      setForm((current) => ({
        ...current,
        coverUrl: uploaded.url,
      }));
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'KhÃ´ng thá»ƒ táº£i áº£nh bÃ¬a lÃªn',
      );
    } finally {
      setUploadingCover(false);
    }
  }

  async function create() {
    if (!validateForm() || submitting) return;

    try {
      setSubmitting(true);
      setError('');

      const created = await createCommunityChallenge({
        title: form.title.trim(),
        description: form.description.trim(),
        target: form.target,
        unit: form.unit,
        rewardXp: form.rewardXp,
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
        clubId,
        challengeType: form.challengeType,
        audience: form.audience,
        maxParticipants: form.maxParticipants
          ? Number(form.maxParticipants)
          : undefined,
        badge: form.badge,
        coverUrl: form.coverUrl || undefined,
      } as Parameters<typeof createCommunityChallenge>[0]);

      setItems((current) => [created, ...current]);
      setCreating(false);
      setForm(initialForm);
      setFieldErrors({});
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'KhÃ´ng thá»ƒ táº¡o thá»­ thÃ¡ch',
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function join(item: CommunityChallengeItem) {
    try {
      await joinCommunityChallenge(item.id);
      await load();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'KhÃ´ng thá»ƒ tham gia thá»­ thÃ¡ch',
      );
    }
  }

  async function updateProgress(
    item: CommunityChallengeItem,
    progress: number,
  ) {
    try {
      await updateCommunityChallengeProgress(item.id, progress);
      await load();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'KhÃ´ng thá»ƒ cáº­p nháº­t tiáº¿n Ä‘á»™',
      );
    }
  }

  return (
    <div className="space-y-5">
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border-2 border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <h3 className="text-lg font-extrabold text-slate-950">
            Thá»­ thÃ¡ch cá»§a cÃ¢u láº¡c bá»™
          </h3>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Táº¡o má»¥c tiÃªu rÃµ rÃ ng Ä‘á»ƒ thÃ nh viÃªn cÃ¹ng tham gia vÃ  nháº­n XP.
          </p>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={() => {
              setCreating((value) => !value);
              setFieldErrors({});
              setError('');
            }}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 font-bold text-white shadow-sm hover:bg-indigo-700"
          >
            {creating ? <X size={17} /> : <Plus size={17} />}
            {creating ? 'ÄÃ³ng biá»ƒu máº«u' : 'Táº¡o thá»­ thÃ¡ch'}
          </button>
        )}
      </section>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      {creating && (
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_420px]">
          <div className="rounded-3xl border-2 border-indigo-200 bg-white p-5 shadow-md">
            <div className="flex items-center gap-2">
              <Trophy size={21} className="text-indigo-600" />
              <h3 className="text-lg font-extrabold text-slate-950">
                ThÃ´ng tin thá»­ thÃ¡ch
              </h3>
            </div>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              CÃ¡c trÆ°á»ng cÃ³ dáº¥u * lÃ  báº¯t buá»™c. Má»—i Ã´ Ä‘á»u cÃ³ hÆ°á»›ng dáº«n Ä‘á»ƒ
              ngÆ°á»i táº¡o hiá»ƒu rÃµ cáº§n nháº­p gÃ¬.
            </p>

            <div className="mt-6 space-y-5">
              <div>
                <FieldLabel
                  label="TÃªn thá»­ thÃ¡ch"
                  required
                  description="TÃªn ngáº¯n gá»n, dá»… nhá»› vÃ  thá»ƒ hiá»‡n rÃµ má»¥c tiÃªu."
                />
                <input
                  value={form.title}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  placeholder="VÃ­ dá»¥: 30 ngÃ y luyá»‡n Speaking"
                  maxLength={120}
                  className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500"
                />
                <ValidationError message={fieldErrors.title} />
              </div>

              <div>
                <FieldLabel
                  label="Loáº¡i thá»­ thÃ¡ch"
                  required
                  description="Chá»n ká»¹ nÄƒng chÃ­nh mÃ  thá»­ thÃ¡ch táº­p trung."
                />
                <select
                  value={form.challengeType}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      challengeType: event.target
                        .value as ChallengeType,
                    }))
                  }
                  className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-slate-900 outline-none focus:border-indigo-500"
                >
                  {challengeTypeOptions.map((option) => (
                    <option
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <FieldLabel
                  label="MÃ´ táº£ vÃ  cÃ¡ch hoÃ n thÃ nh"
                  required
                  description="Giáº£i thÃ­ch thÃ nh viÃªn cáº§n lÃ m gÃ¬ má»—i ngÃ y hoáº·c má»—i láº§n."
                />
                <textarea
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  rows={5}
                  maxLength={4000}
                  placeholder="VÃ­ dá»¥: Má»—i ngÃ y nÃ³i tiáº¿ng Anh Ã­t nháº¥t 10 phÃºt vÃ  Ä‘Äƒng má»™t Ä‘oáº¡n ghi Ã¢m vÃ o Club."
                  className="w-full resize-none rounded-xl border-2 border-slate-200 px-4 py-3 text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500"
                />
                <ValidationError message={fieldErrors.description} />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <FieldLabel
                    label="Má»¥c tiÃªu hoÃ n thÃ nh"
                    required
                    description="Sá»‘ lÆ°á»£ng thÃ nh viÃªn pháº£i Ä‘áº¡t Ä‘á»ƒ hoÃ n thÃ nh."
                  />
                  <input
                    type="number"
                    min={1}
                    value={form.target}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        target: Number(event.target.value),
                      }))
                    }
                    placeholder="VÃ­ dá»¥: 30"
                    className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-slate-900 outline-none focus:border-indigo-500"
                  />
                  <ValidationError message={fieldErrors.target} />
                </div>

                <div>
                  <FieldLabel
                    label="ÄÆ¡n vá»‹ má»¥c tiÃªu"
                    required
                    description="VÃ­ dá»¥: ngÃ y, tá»«, bÃ i, phÃºt hoáº·c láº§n."
                  />
                  <select
                    value={form.unit}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        unit: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-slate-900 outline-none focus:border-indigo-500"
                  >
                    {unitOptions.map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <FieldLabel
                    label="XP thÆ°á»Ÿng khi hoÃ n thÃ nh"
                    required
                    description="Sá»‘ XP ngÆ°á»i há»c nháº­n Ä‘Æ°á»£c sau khi Ä‘áº¡t má»¥c tiÃªu."
                  />
                  <input
                    type="number"
                    min={0}
                    value={form.rewardXp}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        rewardXp: Number(event.target.value),
                      }))
                    }
                    placeholder="VÃ­ dá»¥: 500"
                    className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-slate-900 outline-none focus:border-indigo-500"
                  />
                  <ValidationError message={fieldErrors.rewardXp} />
                </div>

                <div>
                  <FieldLabel
                    label="Huy hiá»‡u hoÃ n thÃ nh"
                    description="Huy hiá»‡u hiá»ƒn thá»‹ khi thÃ nh viÃªn hoÃ n thÃ nh."
                  />
                  <select
                    value={form.badge}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        badge: event.target.value as BadgeType,
                      }))
                    }
                    className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-slate-900 outline-none focus:border-indigo-500"
                  >
                    {Object.entries(badgeLabel).map(
                      ([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ),
                    )}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <FieldLabel
                    label="Thá»i gian báº¯t Ä‘áº§u"
                    required
                    description="Thá»i Ä‘iá»ƒm thá»­ thÃ¡ch chÃ­nh thá»©c má»Ÿ."
                  />
                  <input
                    type="datetime-local"
                    value={form.startsAt}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        startsAt: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-slate-900 outline-none focus:border-indigo-500"
                  />
                  <ValidationError message={fieldErrors.startsAt} />
                </div>

                <div>
                  <FieldLabel
                    label="Thá»i gian káº¿t thÃºc"
                    required
                    description="Sau thá»i Ä‘iá»ƒm nÃ y khÃ´ng thá»ƒ cáº­p nháº­t tiáº¿n Ä‘á»™."
                  />
                  <input
                    type="datetime-local"
                    value={form.endsAt}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        endsAt: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-slate-900 outline-none focus:border-indigo-500"
                  />
                  <ValidationError message={fieldErrors.endsAt} />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <FieldLabel
                    label="Äá»‘i tÆ°á»£ng cÃ³ thá»ƒ tham gia"
                    description="Giá»›i háº¡n thá»­ thÃ¡ch theo nhÃ³m thÃ nh viÃªn phÃ¹ há»£p."
                  />
                  <select
                    value={form.audience}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        audience: event.target.value as AudienceType,
                      }))
                    }
                    className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-slate-900 outline-none focus:border-indigo-500"
                  >
                    {Object.entries(audienceLabel).map(
                      ([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ),
                    )}
                  </select>
                </div>

                <div>
                  <FieldLabel
                    label="Sá»‘ ngÆ°á»i tham gia tá»‘i Ä‘a"
                    description="Äá»ƒ trá»‘ng náº¿u khÃ´ng giá»›i háº¡n sá»‘ ngÆ°á»i."
                  />
                  <input
                    type="number"
                    min={1}
                    value={form.maxParticipants}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        maxParticipants: event.target.value,
                      }))
                    }
                    placeholder="KhÃ´ng giá»›i háº¡n"
                    className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <FieldLabel
                  label="áº¢nh bÃ¬a thá»­ thÃ¡ch"
                  description="CÃ³ thá»ƒ chá»n áº£nh tá»« mÃ¡y. áº¢nh giÃºp thá»­ thÃ¡ch ná»•i báº­t hÆ¡n."
                />

                {form.coverUrl ? (
                  <div className="relative overflow-hidden rounded-2xl border-2 border-slate-200">
                    <img
                      src={form.coverUrl}
                      alt=""
                      className="h-52 w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          coverUrl: '',
                        }))
                      }
                      className="absolute right-3 top-3 rounded-full bg-slate-950/70 p-2 text-white"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploadingCover}
                    className="flex min-h-36 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 text-slate-600 transition hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700 disabled:opacity-50"
                  >
                    {uploadingCover ? (
                      <Loader2 size={26} className="animate-spin" />
                    ) : (
                      <>
                        <Upload size={26} />
                        <span className="mt-2 text-sm font-bold">
                          Chá»n áº£nh bÃ¬a tá»« mÃ¡y
                        </span>
                        <span className="mt-1 text-xs">
                          PNG, JPG hoáº·c WEBP
                        </span>
                      </>
                    )}
                  </button>
                )}

                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  hidden
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void uploadCover(file);
                    event.currentTarget.value = '';
                  }}
                />
              </div>

              <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-5">
                <button
                  type="button"
                  onClick={() => {
                    setCreating(false);
                    setForm(initialForm);
                    setFieldErrors({});
                  }}
                  className="rounded-xl px-5 py-3 font-bold text-slate-700 hover:bg-slate-100"
                >
                  Há»§y
                </button>

                <button
                  type="button"
                  onClick={() => void create()}
                  disabled={
                    submitting || uploadingCover || !formValid
                  }
                  className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {submitting ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={18} />
                  )}
                  {submitting
                    ? 'Äang táº¡o thá»­ thÃ¡ch...'
                    : 'Táº¡o thá»­ thÃ¡ch'}
                </button>
              </div>
            </div>
          </div>

          <ChallengePreview form={form} />
        </section>
      )}

      {loading ? (
        <div className="rounded-3xl border-2 border-slate-200 bg-white py-14 text-center font-semibold text-slate-500">
          Äang táº£i thá»­ thÃ¡ch...
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-slate-300 bg-white py-14 text-center">
          <Trophy size={34} className="mx-auto text-slate-400" />
          <p className="mt-3 font-extrabold text-slate-800">
            ChÆ°a cÃ³ thá»­ thÃ¡ch
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Quáº£n trá»‹ viÃªn cÃ³ thá»ƒ táº¡o thá»­ thÃ¡ch Ä‘áº§u tiÃªn cho Club.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {items.map((item) => {
            const progress = item.myProgress?.progress ?? 0;
            const percent = Math.min(
              Math.round((progress / item.target) * 100),
              100,
            );

            return (
              <article
                key={item.id}
                className="rounded-3xl border-2 border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex gap-4">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-amber-50 text-amber-600">
                    <Trophy size={23} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="text-lg font-extrabold text-slate-950">
                        {item.title}
                      </h4>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                        {item.status}
                      </span>
                    </div>

                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {item.description}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold text-slate-500">
                      <span>{item.participantCount} ngÆ°á»i tham gia</span>
                      <span>{item.rewardXp} XP</span>
                      <span>
                        Má»¥c tiÃªu: {item.target} {item.unit}
                      </span>
                    </div>

                    {item.joined ? (
                      <div className="mt-4">
                        <div className="mb-2 flex justify-between text-sm font-bold text-slate-700">
                          <span>
                            {progress}/{item.target} {item.unit}
                          </span>
                          <span>{percent}%</span>
                        </div>

                        <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-indigo-600 transition-all"
                            style={{ width: `${percent}%` }}
                          />
                        </div>

                        <div className="mt-4">
                          <FieldLabel
                            label="Cáº­p nháº­t tiáº¿n Ä‘á»™"
                            description={`Chá»n sá»‘ ${item.unit} báº¡n Ä‘Ã£ hoÃ n thÃ nh.`}
                          />
                          <input
                            type="range"
                            min={0}
                            max={item.target}
                            value={progress}
                            onChange={(event) =>
                              void updateProgress(
                                item,
                                Number(event.target.value),
                              )
                            }
                            className="w-full"
                          />
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void join(item)}
                        disabled={!joined}
                        className="mt-4 rounded-xl bg-indigo-600 px-4 py-2.5 font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {joined
                          ? 'Tham gia thá»­ thÃ¡ch'
                          : 'Tham gia Club trÆ°á»›c'}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
