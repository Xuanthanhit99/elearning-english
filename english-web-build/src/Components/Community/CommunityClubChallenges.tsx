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
  unit: 'ngày',
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
  { value: 'MIXED', label: 'Tổng hợp' },
  { value: 'OTHER', label: 'Khác' },
];

const unitOptions = [
  'ngày',
  'từ',
  'bài',
  'phút',
  'giờ',
  'lần',
  'điểm XP',
];

const badgeLabel: Record<BadgeType, string> = {
  BRONZE: 'Huy hiệu Đồng',
  SILVER: 'Huy hiệu Bạc',
  GOLD: 'Huy hiệu Vàng',
  DIAMOND: 'Huy hiệu Kim cương',
};

const audienceLabel: Record<AudienceType, string> = {
  ALL_MEMBERS: 'Mọi thành viên',
  NEW_MEMBERS: 'Chỉ thành viên mới',
  A1_A2: 'Chỉ trình độ A1–A2',
  B1_PLUS: 'Chỉ trình độ B1 trở lên',
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
    : 'Chưa chọn';

  const formattedEnd = form.endsAt
    ? new Date(form.endsAt).toLocaleString('vi-VN')
    : 'Chưa chọn';

  return (
    <aside className="sticky top-5 rounded-3xl border-2 border-indigo-200 bg-white p-5 shadow-md">
      <div className="flex items-center gap-2">
        <Sparkles size={19} className="text-indigo-600" />
        <h3 className="font-extrabold text-slate-950">
          Xem trước thử thách
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
            {form.title || 'Tên thử thách sẽ hiển thị tại đây'}
          </h4>

          <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">
            {form.description ||
              'Mô tả mục tiêu và cách hoàn thành thử thách.'}
          </p>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <div className="rounded-2xl bg-indigo-50 p-3">
              <div className="flex items-center gap-2 text-indigo-700">
                <Target size={16} />
                <span className="text-xs font-bold uppercase">
                  Mục tiêu
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
                  Phần thưởng
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
              Bắt đầu: {formattedStart}
            </div>
            <div className="flex items-center gap-2">
              <Clock3 size={14} />
              Kết thúc: {formattedEnd}
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
            Tham gia thử thách
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
          : 'Không thể tải danh sách thử thách',
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
      errors.title = 'Tên thử thách cần ít nhất 5 ký tự.';
    }

    if (form.description.trim().length < 10) {
      errors.description = 'Mô tả cần ít nhất 10 ký tự.';
    }

    if (!Number.isFinite(form.target) || form.target <= 0) {
      errors.target = 'Mục tiêu phải lớn hơn 0.';
    }

    if (!Number.isFinite(form.rewardXp) || form.rewardXp < 0) {
      errors.rewardXp = 'XP thưởng không được nhỏ hơn 0.';
    }

    if (!form.startsAt) {
      errors.startsAt = 'Vui lòng chọn thời gian bắt đầu.';
    }

    if (!form.endsAt) {
      errors.endsAt = 'Vui lòng chọn thời gian kết thúc.';
    }

    if (
      form.startsAt &&
      form.endsAt &&
      new Date(form.endsAt) <= new Date(form.startsAt)
    ) {
      errors.endsAt = 'Thời gian kết thúc phải sau thời gian bắt đầu.';
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
        throw new Error('Vui lòng chọn đúng định dạng ảnh.');
      }

      setForm((current) => ({
        ...current,
        coverUrl: uploaded.url,
      }));
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Không thể tải ảnh bìa lên',
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
        e instanceof Error ? e.message : 'Không thể tạo thử thách',
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
        e instanceof Error ? e.message : 'Không thể tham gia thử thách',
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
        e instanceof Error ? e.message : 'Không thể cập nhật tiến độ',
      );
    }
  }

  return (
    <div className="space-y-5">
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border-2 border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <h3 className="text-lg font-extrabold text-slate-950">
            Thử thách của câu lạc bộ
          </h3>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Tạo mục tiêu rõ ràng để thành viên cùng tham gia và nhận XP.
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
            {creating ? 'Đóng biểu mẫu' : 'Tạo thử thách'}
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
                Thông tin thử thách
              </h3>
            </div>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              Các trường có dấu * là bắt buộc. Mỗi ô đều có hướng dẫn để
              người tạo hiểu rõ cần nhập gì.
            </p>

            <div className="mt-6 space-y-5">
              <div>
                <FieldLabel
                  label="Tên thử thách"
                  required
                  description="Tên ngắn gọn, dễ nhớ và thể hiện rõ mục tiêu."
                />
                <input
                  value={form.title}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  placeholder="Ví dụ: 30 ngày luyện Speaking"
                  maxLength={120}
                  className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500"
                />
                <ValidationError message={fieldErrors.title} />
              </div>

              <div>
                <FieldLabel
                  label="Loại thử thách"
                  required
                  description="Chọn kỹ năng chính mà thử thách tập trung."
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
                  label="Mô tả và cách hoàn thành"
                  required
                  description="Giải thích thành viên cần làm gì mỗi ngày hoặc mỗi lần."
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
                  placeholder="Ví dụ: Mỗi ngày nói tiếng Anh ít nhất 10 phút và đăng một đoạn ghi âm vào Club."
                  className="w-full resize-none rounded-xl border-2 border-slate-200 px-4 py-3 text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500"
                />
                <ValidationError message={fieldErrors.description} />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <FieldLabel
                    label="Mục tiêu hoàn thành"
                    required
                    description="Số lượng thành viên phải đạt để hoàn thành."
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
                    placeholder="Ví dụ: 30"
                    className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-slate-900 outline-none focus:border-indigo-500"
                  />
                  <ValidationError message={fieldErrors.target} />
                </div>

                <div>
                  <FieldLabel
                    label="Đơn vị mục tiêu"
                    required
                    description="Ví dụ: ngày, từ, bài, phút hoặc lần."
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
                    label="XP thưởng khi hoàn thành"
                    required
                    description="Số XP người học nhận được sau khi đạt mục tiêu."
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
                    placeholder="Ví dụ: 500"
                    className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-slate-900 outline-none focus:border-indigo-500"
                  />
                  <ValidationError message={fieldErrors.rewardXp} />
                </div>

                <div>
                  <FieldLabel
                    label="Huy hiệu hoàn thành"
                    description="Huy hiệu hiển thị khi thành viên hoàn thành."
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
                    label="Thời gian bắt đầu"
                    required
                    description="Thời điểm thử thách chính thức mở."
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
                    label="Thời gian kết thúc"
                    required
                    description="Sau thời điểm này không thể cập nhật tiến độ."
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
                    label="Đối tượng có thể tham gia"
                    description="Giới hạn thử thách theo nhóm thành viên phù hợp."
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
                    label="Số người tham gia tối đa"
                    description="Để trống nếu không giới hạn số người."
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
                    placeholder="Không giới hạn"
                    className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <FieldLabel
                  label="Ảnh bìa thử thách"
                  description="Có thể chọn ảnh từ máy. Ảnh giúp thử thách nổi bật hơn."
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
                          Chọn ảnh bìa từ máy
                        </span>
                        <span className="mt-1 text-xs">
                          PNG, JPG hoặc WEBP
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
                  Hủy
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
                    ? 'Đang tạo thử thách...'
                    : 'Tạo thử thách'}
                </button>
              </div>
            </div>
          </div>

          <ChallengePreview form={form} />
        </section>
      )}

      {loading ? (
        <div className="rounded-3xl border-2 border-slate-200 bg-white py-14 text-center font-semibold text-slate-500">
          Đang tải thử thách...
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-slate-300 bg-white py-14 text-center">
          <Trophy size={34} className="mx-auto text-slate-400" />
          <p className="mt-3 font-extrabold text-slate-800">
            Chưa có thử thách
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Quản trị viên có thể tạo thử thách đầu tiên cho Club.
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
                      <span>{item.participantCount} người tham gia</span>
                      <span>{item.rewardXp} XP</span>
                      <span>
                        Mục tiêu: {item.target} {item.unit}
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
                            label="Cập nhật tiến độ"
                            description={`Chọn số ${item.unit} bạn đã hoàn thành.`}
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
                          ? 'Tham gia thử thách'
                          : 'Tham gia Club trước'}
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
