'use client';

import { Loader2, Plus, Send } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  createClubPost,
  getClubPosts,
} from '@/src/lib/community-club-api';
import type { CommunityPost } from '@/src/types/community';
import { CommunityPostCard } from '@/src/Components/Community/CommunityPostCard';

export function CommunityClubPosts({
  clubId,
  canPost,
}: {
  clubId: string;
  canPost: boolean;
}) {
  const [items, setItems] = useState<CommunityPost[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    type: 'SHARE',
    title: '',
    content: '',
    tags: '',
  });

  async function load(reset = true) {
    try {
      reset ? setLoading(true) : undefined;

      const result = await getClubPosts(
        clubId,
        reset ? undefined : cursor ?? undefined,
      );

      setItems((current) =>
        reset ? result.items : [...current, ...result.items],
      );
      setCursor(result.nextCursor);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [clubId]);

  async function submit() {
    if (!form.content.trim() || submitting) return;

    try {
      setSubmitting(true);

      const created = await createClubPost(clubId, {
        type: form.type,
        title: form.title.trim() || undefined,
        content: form.content.trim(),
        tags: form.tags
          .split(',')
          .map((tag) => tag.trim().replace(/^#/, ''))
          .filter(Boolean),
      });

      setItems((current) => [created, ...current]);
      setCreating(false);
      setForm({
        type: 'SHARE',
        title: '',
        content: '',
        tags: '',
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      {canPost && (
        <section className="rounded-3xl border-2 border-slate-200 bg-white p-5 shadow-sm">
          {!creating ? (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="flex w-full items-center gap-3 rounded-2xl border-2 border-dashed border-slate-300 px-4 py-4 text-left transition hover:border-indigo-400 hover:bg-indigo-50"
            >
              <span className="grid h-10 w-10 place-items-center rounded-full bg-indigo-600 text-white">
                <Plus size={20} />
              </span>
              <span>
                <strong className="block text-slate-900">
                  Đăng bài trong câu lạc bộ
                </strong>
                <small className="text-slate-500">
                  Chia sẻ kiến thức hoặc đặt câu hỏi cho thành viên.
                </small>
              </span>
            </button>
          ) : (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
                <select
                  value={form.type}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      type: event.target.value,
                    }))
                  }
                  className="rounded-xl border-2 border-slate-200 px-4 py-3"
                >
                  <option value="SHARE">Chia sẻ</option>
                  <option value="QUESTION">Hỏi đáp</option>
                  <option value="SPEAKING">Speaking</option>
                  <option value="WRITING">Writing</option>
                </select>

                <input
                  value={form.title}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  placeholder="Tiêu đề"
                  className="rounded-xl border-2 border-slate-200 px-4 py-3"
                />
              </div>

              <textarea
                value={form.content}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    content: event.target.value,
                  }))
                }
                rows={5}
                placeholder="Nội dung bài viết..."
                className="w-full resize-none rounded-xl border-2 border-slate-200 px-4 py-3 outline-none focus:border-indigo-500"
              />

              <input
                value={form.tags}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    tags: event.target.value,
                  }))
                }
                placeholder="Tags, cách nhau bằng dấu phẩy"
                className="w-full rounded-xl border-2 border-slate-200 px-4 py-3"
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCreating(false)}
                  className="rounded-xl px-4 py-2.5 font-bold text-slate-700"
                >
                  Hủy
                </button>

                <button
                  type="button"
                  onClick={() => void submit()}
                  disabled={submitting || !form.content.trim()}
                  className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 font-bold text-white disabled:opacity-50"
                >
                  {submitting ? (
                    <Loader2 size={17} className="animate-spin" />
                  ) : (
                    <Send size={17} />
                  )}
                  Đăng bài
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {loading ? (
        <div className="rounded-3xl border bg-white py-12 text-center text-slate-500">
          Đang tải bài viết...
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-slate-300 bg-white py-12 text-center">
          <p className="font-bold text-slate-800">
            Chưa có bài viết trong câu lạc bộ
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Hãy bắt đầu cuộc thảo luận đầu tiên.
          </p>
        </div>
      ) : (
        items.map((post) => (
          <CommunityPostCard key={post.id} initialPost={post} />
        ))
      )}

      {cursor && (
        <button
          type="button"
          onClick={() => void load(false)}
          className="w-full rounded-xl border-2 border-slate-200 bg-white py-3 font-bold text-indigo-700"
        >
          Xem thêm
        </button>
      )}
    </div>
  );
}
