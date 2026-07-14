'use client';

import {
  ArrowRight,
  Loader2,
  Lock,
  Plus,
  Search,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  createCommunityClub,
  getCommunityClubs,
  joinCommunityClub,
  leaveCommunityClub,
} from '@/src/lib/community-social-api';
import type { CommunityClubItem } from '@/src/types/community-social';

type CreateClubForm = {
  name: string;
  description: string;
  privacy: 'PUBLIC' | 'PRIVATE';
  category: string;
  tags: string;
  coverUrl: string;
  iconUrl: string;
};

const initialForm: CreateClubForm = {
  name: '',
  description: '',
  privacy: 'PUBLIC',
  category: '',
  tags: '',
  coverUrl: '',
  iconUrl: '',
};

export function CommunityClubsView() {
  const router = useRouter();

  const [items, setItems] = useState<CommunityClubItem[]>([]);
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<CreateClubForm>(initialForm);
  const [loading, setLoading] = useState(true);
  const [creatingClub, setCreatingClub] = useState(false);
  const [changingClubId, setChangingClubId] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function load() {
    try {
      setLoading(true);
      setError('');

      const result = await getCommunityClubs(
        search.trim() || undefined,
      );

      setItems(Array.isArray(result) ? result : []);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Không thể tải danh sách câu lạc bộ',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // Chỉ tải lần đầu. Tìm kiếm được gọi thủ công.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function create() {
    if (!form.name.trim() || creatingClub) return;

    try {
      setCreatingClub(true);
      setError('');

      const created = await createCommunityClub({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        privacy: form.privacy,
        category: form.category.trim() || undefined,
        tags: form.tags
          .split(',')
          .map((tag) => tag.trim().replace(/^#/, ''))
          .filter(Boolean),
        coverUrl: form.coverUrl.trim() || undefined,
        iconUrl: form.iconUrl.trim() || undefined,
      });

      setItems((current) => [created, ...current]);
      setCreating(false);
      setForm(initialForm);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Không thể tạo câu lạc bộ',
      );
    } finally {
      setCreatingClub(false);
    }
  }

  async function toggleMembership(club: CommunityClubItem) {
    if (changingClubId) return;

    try {
      setChangingClubId(club.id);
      setError('');

      if (club.joined) {
        await leaveCommunityClub(club.id);

        setItems((current) =>
          current.map((item) =>
            item.id === club.id
              ? {
                  ...item,
                  joined: false,
                  myRole: null,
                  memberCount: Math.max(item.memberCount - 1, 0),
                }
              : item,
          ),
        );

        return;
      }

      const result = await joinCommunityClub(club.id);

      const pending =
        typeof result === 'object' &&
        result !== null &&
        'status' in result &&
        result.status === 'PENDING';

      setItems((current) =>
        current.map((item) =>
          item.id === club.id
            ? {
                ...item,
                joined: pending ? false : true,
                myRole: pending ? null : 'MEMBER',
                memberCount: pending
                  ? item.memberCount
                  : item.memberCount + 1,
              }
            : item,
        ),
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Không thể cập nhật trạng thái câu lạc bộ',
      );
    } finally {
      setChangingClubId(null);
    }
  }

  function openClub(club: CommunityClubItem) {
    router.push(`/community/clubs/${club.id}`);
  }

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border-2 border-slate-200 bg-white p-5 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-slate-950">
              Câu lạc bộ
            </h2>
            <p className="mt-1 text-sm font-medium text-slate-600">
              Tham gia nhóm theo mục tiêu, cấp độ hoặc sở thích.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setCreating((value) => !value)}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 font-bold text-white shadow-sm transition hover:bg-indigo-700"
          >
            {creating ? <X size={18} /> : <Plus size={18} />}
            {creating ? 'Đóng biểu mẫu' : 'Tạo câu lạc bộ'}
          </button>
        </div>

        <div className="mt-4 flex gap-2">
          <div className="relative min-w-0 flex-1">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
            />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void load();
              }}
              placeholder="Tìm câu lạc bộ theo tên, mô tả hoặc hashtag..."
              className="w-full rounded-xl border-2 border-slate-200 py-3 pl-10 pr-4 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500"
            />
          </div>

          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="rounded-xl border-2 border-slate-200 px-5 font-bold text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 disabled:opacity-50"
          >
            {loading ? 'Đang tìm...' : 'Tìm'}
          </button>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      {creating && (
        <section className="rounded-3xl border-2 border-indigo-200 bg-white p-5 shadow-md">
          <h3 className="text-lg font-extrabold text-slate-950">
            Tạo câu lạc bộ mới
          </h3>

          <p className="mt-1 text-sm text-slate-600">
            Sau khi tạo, bạn sẽ là chủ câu lạc bộ và có thể quản lý
            thành viên, bài viết, chat nhóm, thử thách và tài liệu.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-bold text-slate-700">
                Tên câu lạc bộ *
              </span>
              <input
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="Ví dụ: IELTS Warriors"
                maxLength={80}
                className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-slate-900 outline-none focus:border-indigo-500"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-bold text-slate-700">
                Danh mục
              </span>
              <input
                value={form.category}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    category: event.target.value,
                  }))
                }
                placeholder="IELTS, Speaking, TOEIC..."
                className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-slate-900 outline-none focus:border-indigo-500"
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-sm font-bold text-slate-700">
                Mô tả
              </span>
              <textarea
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder="Mục tiêu, nội quy và nội dung chính của câu lạc bộ..."
                rows={4}
                maxLength={2000}
                className="w-full resize-none rounded-xl border-2 border-slate-200 px-4 py-3 text-slate-900 outline-none focus:border-indigo-500"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-bold text-slate-700">
                Hashtag
              </span>
              <input
                value={form.tags}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    tags: event.target.value,
                  }))
                }
                placeholder="ielts, speaking, daily-english"
                className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-slate-900 outline-none focus:border-indigo-500"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-bold text-slate-700">
                Quyền riêng tư
              </span>
              <select
                value={form.privacy}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    privacy: event.target.value as
                      | 'PUBLIC'
                      | 'PRIVATE',
                  }))
                }
                className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-slate-900 outline-none focus:border-indigo-500"
              >
                <option value="PUBLIC">
                  Công khai — tham gia ngay
                </option>
                <option value="PRIVATE">
                  Riêng tư — cần quản trị viên duyệt
                </option>
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-bold text-slate-700">
                URL ảnh bìa
              </span>
              <input
                value={form.coverUrl}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    coverUrl: event.target.value,
                  }))
                }
                placeholder="https://..."
                className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-slate-900 outline-none focus:border-indigo-500"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-bold text-slate-700">
                URL biểu tượng
              </span>
              <input
                value={form.iconUrl}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    iconUrl: event.target.value,
                  }))
                }
                placeholder="https://..."
                className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-slate-900 outline-none focus:border-indigo-500"
              />
            </label>
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setCreating(false);
                setForm(initialForm);
              }}
              className="rounded-xl px-4 py-2.5 font-bold text-slate-700 hover:bg-slate-100"
            >
              Hủy
            </button>

            <button
              type="button"
              onClick={() => void create()}
              disabled={creatingClub || !form.name.trim()}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
            >
              {creatingClub && (
                <Loader2 size={18} className="animate-spin" />
              )}
              {creatingClub ? 'Đang tạo...' : 'Tạo câu lạc bộ'}
            </button>
          </div>
        </section>
      )}

      {loading ? (
        <div className="flex justify-center rounded-3xl border-2 border-slate-200 bg-white py-14 text-slate-600">
          <Loader2 className="animate-spin text-indigo-600" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-slate-300 bg-white px-5 py-14 text-center">
          <Users size={30} className="mx-auto text-slate-400" />
          <h3 className="mt-3 font-extrabold text-slate-900">
            Chưa tìm thấy câu lạc bộ
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Hãy thay đổi từ khóa hoặc tạo câu lạc bộ đầu tiên.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((club) => (
            <article
              key={club.id}
              role="button"
              tabIndex={0}
              onClick={() => openClub(club)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') openClub(club);
              }}
              className="group cursor-pointer overflow-hidden rounded-3xl border-2 border-slate-200 bg-white shadow-md transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-lg"
            >
              <div className="relative h-32 bg-gradient-to-br from-indigo-600 to-violet-600">
                {club.coverUrl ? (
                  <img
                    src={club.coverUrl}
                    alt={`Ảnh bìa ${club.name}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.3),transparent_45%)]" />
                )}

                <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-slate-950/70 px-3 py-1 text-xs font-bold text-white backdrop-blur-sm">
                  {club.privacy === 'PRIVATE' && <Lock size={12} />}
                  {club.privacy === 'PRIVATE'
                    ? 'Riêng tư'
                    : 'Công khai'}
                </span>
              </div>

              <div className="p-5">
                <div className="flex items-start gap-3">
                  <div className="-mt-10 grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl border-4 border-white bg-indigo-100 text-indigo-700 shadow-md">
                    {club.iconUrl ? (
                      <img
                        src={club.iconUrl}
                        alt={`Biểu tượng ${club.name}`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Users size={26} />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-lg font-extrabold text-slate-950">
                      {club.name}
                    </h3>

                    <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                      <Users size={13} />
                      {club.memberCount} thành viên
                      {club.postCount !== undefined && (
                        <> · {club.postCount} bài viết</>
                      )}
                    </p>
                  </div>
                </div>

                <p className="mt-4 line-clamp-3 min-h-[72px] text-sm leading-6 text-slate-700">
                  {club.description || 'Chưa có mô tả.'}
                </p>

                {club.tags.length > 0 && (
                  <div className="mt-4 flex min-h-7 flex-wrap gap-2">
                    {club.tags.slice(0, 4).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-5 flex gap-2">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      void toggleMembership(club);
                    }}
                    disabled={changingClubId === club.id}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 font-bold transition disabled:opacity-50 ${
                      club.joined
                        ? 'border-2 border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                    }`}
                  >
                    {changingClubId === club.id && (
                      <Loader2 size={17} className="animate-spin" />
                    )}
                    {club.joined ? 'Rời câu lạc bộ' : 'Tham gia'}
                  </button>

                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      openClub(club);
                    }}
                    className="flex items-center gap-2 rounded-xl border-2 border-indigo-200 px-4 py-2.5 font-bold text-indigo-700 transition hover:bg-indigo-50"
                  >
                    Xem
                    <ArrowRight size={17} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}