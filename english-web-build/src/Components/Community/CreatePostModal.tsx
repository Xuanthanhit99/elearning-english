'use client';

import { useMemo, useState } from 'react';
import { BookOpen, HelpCircle, ImageIcon, Mic, PenLine, Trophy, X } from 'lucide-react';
import { createCommunityPost } from '@/src/lib/community-api';
import type { CommunityPost, CommunityPostType } from '@/src/types/community';

const options: Array<{ type: CommunityPostType; label: string; description: string; icon: typeof BookOpen }> = [
  { type: 'SHARE', label: 'Chia sẻ điều đã học', description: 'Kiến thức, tài liệu hoặc kinh nghiệm học', icon: BookOpen },
  { type: 'QUESTION', label: 'Hỏi cộng đồng', description: 'Đặt câu hỏi và nhận góp ý', icon: HelpCircle },
  { type: 'SPEAKING', label: 'Chia sẻ bài nói', description: 'Đăng audio để mọi người lắng nghe', icon: Mic },
  { type: 'WRITING', label: 'Chia sẻ bài viết', description: 'Đăng đoạn văn hoặc bài luận', icon: PenLine },
  { type: 'IMAGE', label: 'Góc học tập', description: 'Chia sẻ hình ảnh, sách hoặc không gian học', icon: ImageIcon },
  { type: 'ACHIEVEMENT', label: 'Khoe thành tích', description: 'Chia sẻ streak, cấp độ hoặc cột mốc', icon: Trophy },
];

export function CreatePostModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (post: CommunityPost) => void }) {
  const [type, setType] = useState<CommunityPostType | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const selected = useMemo(() => options.find((item) => item.type === type), [type]);
  if (!open) return null;

  async function submit() {
    if (!type || !content.trim()) return;
    try {
      setSubmitting(true);
      setError('');
      const media = mediaUrl.trim()
        ? [{ type: type === 'SPEAKING' ? ('AUDIO' as const) : ('IMAGE' as const), url: mediaUrl.trim() }]
        : undefined;
      const post = await createCommunityPost({
        type,
        title: title.trim() || undefined,
        content: content.trim(),
        tags: tags.split(',').map((x) => x.trim()).filter(Boolean),
        media,
        visibility: 'PUBLIC',
      });
      onCreated(post);
      setType(null); setTitle(''); setContent(''); setTags(''); setMediaUrl('');
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể tạo bài viết');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 py-5">
          <div><h2 className="text-xl font-bold">Tạo bài đăng</h2><p className="text-sm text-slate-500">Chọn đúng mục đích để cộng đồng dễ tương tác.</p></div>
          <button type="button" onClick={onClose} className="rounded-full p-2 hover:bg-slate-100"><X /></button>
        </div>

        {!type ? (
          <div className="grid gap-3 p-6 sm:grid-cols-2">
            {options.map((item) => {
              const Icon = item.icon;
              return <button key={item.type} onClick={() => setType(item.type)} className="flex gap-4 rounded-2xl border p-4 text-left transition hover:border-indigo-400 hover:bg-indigo-50"><span className="rounded-xl bg-indigo-100 p-3 text-indigo-600"><Icon size={22} /></span><span><strong className="block">{item.label}</strong><small className="text-slate-500">{item.description}</small></span></button>;
            })}
          </div>
        ) : (
          <div className="space-y-5 p-6">
            <button type="button" onClick={() => setType(null)} className="text-sm font-semibold text-indigo-600">← Chọn loại bài khác</button>
            <div className="rounded-2xl bg-indigo-50 p-4"><strong>{selected?.label}</strong><p className="text-sm text-slate-600">{selected?.description}</p></div>
            <label className="block"><span className="mb-2 block text-sm font-semibold">Tiêu đề</span><input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} className="w-full rounded-xl border px-4 py-3 outline-none focus:border-indigo-500" placeholder={type === 'QUESTION' ? 'Bạn đang muốn hỏi điều gì?' : 'Tiêu đề ngắn gọn'} /></label>
            <label className="block"><span className="mb-2 block text-sm font-semibold">Nội dung *</span><textarea value={content} onChange={(e) => setContent(e.target.value)} rows={7} className="w-full rounded-xl border px-4 py-3 outline-none focus:border-indigo-500" placeholder="Chia sẻ rõ ràng, thân thiện và tôn trọng mọi người..." /></label>
            {(type === 'SPEAKING' || type === 'IMAGE') && <label className="block"><span className="mb-2 block text-sm font-semibold">{type === 'SPEAKING' ? 'URL audio' : 'URL hình ảnh'}</span><input value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} className="w-full rounded-xl border px-4 py-3" placeholder="https://..." /></label>}
            <label className="block"><span className="mb-2 block text-sm font-semibold">Hashtag</span><input value={tags} onChange={(e) => setTags(e.target.value)} className="w-full rounded-xl border px-4 py-3" placeholder="grammar, speaking, daily-english" /></label>
            {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-3"><button type="button" onClick={onClose} className="rounded-xl px-5 py-3 font-semibold">Hủy</button><button type="button" onClick={submit} disabled={submitting || !content.trim()} className="rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white disabled:opacity-50">{submitting ? 'Đang đăng...' : 'Đăng bài'}</button></div>
          </div>
        )}
      </div>
    </div>
  );
}
