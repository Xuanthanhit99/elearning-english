'use client';

import { CalendarDays, ExternalLink, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  attendClubEvent,
  createClubEvent,
  getClubEvents,
} from '@/src/lib/community-club-api';
import type { ClubEvent } from '@/src/types/community-club';

export function CommunityClubEvents({
  clubId,
  canManage,
  joined,
}: {
  clubId: string;
  canManage: boolean;
  joined: boolean;
}) {
  const [items, setItems] = useState<ClubEvent[]>([]);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    startsAt: '',
    endsAt: '',
    meetingUrl: '',
  });

  async function load() {
    setItems(await getClubEvents(clubId));
  }

  useEffect(() => {
    void load();
  }, [clubId]);

  async function create() {
    const created = await createClubEvent(clubId, {
      title: form.title,
      description: form.description || undefined,
      startsAt: new Date(form.startsAt).toISOString(),
      endsAt: form.endsAt
        ? new Date(form.endsAt).toISOString()
        : undefined,
      meetingUrl: form.meetingUrl || undefined,
    });

    setItems((current) => [...current, created]);
    setCreating(false);
  }

  async function attend(item: ClubEvent) {
    await attendClubEvent(clubId, item.id);
    await load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-3xl border-2 border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <h3 className="text-lg font-extrabold text-slate-950">
            Sự kiện câu lạc bộ
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Buổi học, speaking room và hoạt động chung.
          </p>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={() => setCreating((value) => !value)}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 font-bold text-white"
          >
            <Plus size={17} />
            Tạo sự kiện
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
              placeholder="Tên sự kiện"
              className="rounded-xl border-2 px-4 py-3"
            />
            <input
              value={form.meetingUrl}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  meetingUrl: event.target.value,
                }))
              }
              placeholder="Link Google Meet/Zoom"
              className="rounded-xl border-2 px-4 py-3"
            />
            <textarea
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              rows={4}
              placeholder="Mô tả sự kiện"
              className="rounded-xl border-2 px-4 py-3 sm:col-span-2"
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
              className="rounded-xl border-2 px-4 py-3"
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
              className="rounded-xl border-2 px-4 py-3"
            />
          </div>

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => void create()}
              className="rounded-xl bg-indigo-600 px-5 py-2.5 font-bold text-white"
            >
              Tạo sự kiện
            </button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-slate-300 bg-white py-12 text-center">
          <CalendarDays size={30} className="mx-auto text-slate-400" />
          <p className="mt-3 font-bold text-slate-800">
            Chưa có sự kiện
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {items.map((item) => (
            <article
              key={item.id}
              className="rounded-3xl border-2 border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="font-extrabold text-slate-950">
                    {item.title}
                  </h4>
                  <p className="mt-1 text-xs font-bold text-indigo-700">
                    {new Date(item.startsAt).toLocaleString('vi-VN')}
                  </p>
                </div>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">
                  {item.status}
                </span>
              </div>

              <p className="mt-3 text-sm leading-6 text-slate-600">
                {item.description || 'Không có mô tả.'}
              </p>

              <p className="mt-3 text-xs font-semibold text-slate-500">
                {item.attendeeCount} người đăng ký
              </p>

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => void attend(item)}
                  disabled={!joined || item.attendees.length > 0}
                  className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                >
                  {item.attendees.length > 0
                    ? 'Đã đăng ký'
                    : 'Tham gia'}
                </button>

                {item.meetingUrl && (
                  <a
                    href={item.meetingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 rounded-xl border-2 border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700"
                  >
                    <ExternalLink size={16} />
                    Mở phòng
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
