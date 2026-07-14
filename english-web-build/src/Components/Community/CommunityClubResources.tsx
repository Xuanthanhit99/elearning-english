'use client';

import {
  Download,
  File,
  FileAudio,
  FileText,
  Image,
  Link,
  Plus,
  Video,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  createClubResource,
  getClubResources,
} from '@/src/lib/community-club-api';
import { uploadCommunityFile } from '@/src/lib/community-social-api';
import type { ClubResource } from '@/src/types/community-club';

const iconMap = {
  PDF: FileText,
  DOCUMENT: File,
  LINK: Link,
  AUDIO: FileAudio,
  VIDEO: Video,
  IMAGE: Image,
  OTHER: File,
};

export function CommunityClubResources({
  clubId,
  canUpload,
}: {
  clubId: string;
  canUpload: boolean;
}) {
  const [items, setItems] = useState<ClubResource[]>([]);
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    type: 'LINK',
    url: '',
    fileName: '',
    mimeType: '',
    sizeBytes: 0,
  });

  async function load() {
    setItems(await getClubResources(clubId));
  }

  useEffect(() => {
    void load();
  }, [clubId]);

  async function uploadFile(file: globalThis.File) {
    try {
      setUploading(true);
      const uploaded = await uploadCommunityFile(file);

      setForm((current) => ({
        ...current,
        title: current.title || file.name,
        type:
          uploaded.type === 'IMAGE'
            ? 'IMAGE'
            : uploaded.type === 'AUDIO'
              ? 'AUDIO'
              : file.type === 'application/pdf'
                ? 'PDF'
                : 'DOCUMENT',
        url: uploaded.url,
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
      }));
    } finally {
      setUploading(false);
    }
  }

  async function create() {
    const created = await createClubResource(clubId, {
      title: form.title,
      description: form.description || undefined,
      type: form.type,
      url: form.url,
      fileName: form.fileName || undefined,
      mimeType: form.mimeType || undefined,
      sizeBytes: form.sizeBytes || undefined,
    });

    setItems((current) => [created, ...current]);
    setCreating(false);
    setForm({
      title: '',
      description: '',
      type: 'LINK',
      url: '',
      fileName: '',
      mimeType: '',
      sizeBytes: 0,
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-3xl border-2 border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <h3 className="text-lg font-extrabold text-slate-950">
            Tài liệu câu lạc bộ
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Chia sẻ PDF, Word, ảnh, audio, video hoặc liên kết.
          </p>
        </div>

        {canUpload && (
          <button
            type="button"
            onClick={() => setCreating((value) => !value)}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 font-bold text-white"
          >
            <Plus size={17} />
            Thêm tài liệu
          </button>
        )}
      </div>

      {creating && (
        <div className="rounded-3xl border-2 border-indigo-200 bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              value={form.title}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
              placeholder="Tên tài liệu"
              className="rounded-xl border-2 px-4 py-3"
            />

            <select
              value={form.type}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  type: event.target.value,
                }))
              }
              className="rounded-xl border-2 px-4 py-3"
            >
              <option value="LINK">Liên kết</option>
              <option value="PDF">PDF</option>
              <option value="DOCUMENT">Tài liệu</option>
              <option value="AUDIO">Audio</option>
              <option value="VIDEO">Video</option>
              <option value="IMAGE">Ảnh</option>
              <option value="OTHER">Khác</option>
            </select>

            <textarea
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              rows={3}
              placeholder="Mô tả"
              className="rounded-xl border-2 px-4 py-3 sm:col-span-2"
            />

            <input
              value={form.url}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  url: event.target.value,
                }))
              }
              placeholder="URL tài liệu"
              className="rounded-xl border-2 px-4 py-3"
            />

            <label className="flex cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-slate-300 px-4 py-3 font-bold text-slate-600 hover:border-indigo-400 hover:bg-indigo-50">
              {uploading ? 'Đang tải...' : 'Chọn file từ máy'}
              <input
                type="file"
                hidden
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void uploadFile(file);
                }}
              />
            </label>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => void create()}
              disabled={!form.title.trim() || !form.url.trim()}
              className="rounded-xl bg-indigo-600 px-5 py-2.5 font-bold text-white disabled:opacity-50"
            >
              Lưu tài liệu
            </button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-slate-300 bg-white py-12 text-center">
          <FileText size={30} className="mx-auto text-slate-400" />
          <p className="mt-3 font-bold text-slate-800">
            Chưa có tài liệu
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((item) => {
            const Icon = iconMap[item.type];

            return (
              <article
                key={item.id}
                className="rounded-3xl border-2 border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex gap-3">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-indigo-50 text-indigo-700">
                    <Icon size={21} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h4 className="truncate font-extrabold text-slate-950">
                      {item.title}
                    </h4>
                    <p className="mt-1 text-xs text-slate-500">
                      {item.uploader.fullname} ·{' '}
                      {new Date(item.createdAt).toLocaleDateString(
                        'vi-VN',
                      )}
                    </p>
                  </div>
                </div>

                <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
                  {item.description || 'Không có mô tả.'}
                </p>

                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white"
                >
                  <Download size={16} />
                  Mở tài liệu
                </a>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
