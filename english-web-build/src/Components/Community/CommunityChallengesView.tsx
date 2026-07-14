'use client';

import { Plus, Trophy } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  createCommunityChallenge,
  getCommunityChallenges,
  joinCommunityChallenge,
  updateCommunityChallengeProgress,
} from '@/src/lib/community-social-api';
import type { CommunityChallengeItem } from '@/src/types/community-social';

export function CommunityChallengesView() {
  const [items, setItems] = useState<CommunityChallengeItem[]>([]);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    target: 7,
    unit: 'ngày',
    rewardXp: 50,
    startsAt: '',
    endsAt: '',
  });

  async function load() {
    setItems(await getCommunityChallenges());
  }

  useEffect(() => {
    void load();
  }, []);

  async function create() {
    const created = await createCommunityChallenge({
      ...form,
      startsAt: new Date(form.startsAt).toISOString(),
      endsAt: new Date(form.endsAt).toISOString(),
    });
    setItems((current) => [created, ...current]);
    setCreating(false);
  }

  async function join(item: CommunityChallengeItem) {
    await joinCommunityChallenge(item.id);
    setItems((current) =>
      current.map((challenge) =>
        challenge.id === item.id
          ? {
              ...challenge,
              joined: true,
              participantCount: challenge.participantCount + 1,
              myProgress: {
                id: '',
                progress: 0,
                status: 'JOINED',
              },
            }
          : challenge,
      ),
    );
  }

  async function updateProgress(
    item: CommunityChallengeItem,
    value: number,
  ) {
    const updated = await updateCommunityChallengeProgress(
      item.id,
      value,
    );
    setItems((current) =>
      current.map((challenge) =>
        challenge.id === item.id
          ? {
              ...challenge,
              myProgress: updated,
            }
          : challenge,
      ),
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between rounded-3xl border bg-white p-5 shadow-sm">
        <div>
          <h2 className="text-xl font-bold">Thử thách cộng đồng</h2>
          <p className="mt-1 text-sm text-slate-500">
            Cùng nhau duy trì thói quen học tập.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreating((value) => !value)}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 font-semibold text-white"
        >
          <Plus size={18} />
          Tạo thử thách
        </button>
      </div>

      {creating && (
        <div className="rounded-3xl border bg-white p-5 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              value={form.title}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
              placeholder="Tên thử thách"
              className="rounded-xl border px-4 py-3"
            />
            <input
              value={form.unit}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  unit: event.target.value,
                }))
              }
              placeholder="Đơn vị"
              className="rounded-xl border px-4 py-3"
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
              placeholder="Mô tả"
              className="rounded-xl border px-4 py-3 sm:col-span-2"
            />
            <input
              type="number"
              value={form.target}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  target: Number(event.target.value),
                }))
              }
              className="rounded-xl border px-4 py-3"
            />
            <input
              type="number"
              value={form.rewardXp}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  rewardXp: Number(event.target.value),
                }))
              }
              className="rounded-xl border px-4 py-3"
              placeholder="XP thưởng"
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
              className="rounded-xl border px-4 py-3"
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
              className="rounded-xl border px-4 py-3"
            />
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="rounded-xl px-4 py-2.5 font-semibold"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={() => void create()}
              className="rounded-xl bg-indigo-600 px-5 py-2.5 font-semibold text-white"
            >
              Tạo
            </button>
          </div>
        </div>
      )}

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
              className="rounded-3xl border bg-white p-5 shadow-sm"
            >
              <div className="flex items-start gap-4">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-50 text-amber-600">
                  <Trophy size={23} />
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-bold">{item.title}</h3>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">
                      {item.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {item.description}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    {item.participantCount} người tham gia · Thưởng{' '}
                    {item.rewardXp} XP
                  </p>

                  {item.joined ? (
                    <div className="mt-4">
                      <div className="mb-2 flex justify-between text-sm">
                        <span>
                          {progress}/{item.target} {item.unit}
                        </span>
                        <strong>{percent}%</strong>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full bg-indigo-600"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
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
                        className="mt-3 w-full"
                      />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void join(item)}
                      className="mt-4 rounded-xl bg-indigo-600 px-4 py-2.5 font-semibold text-white"
                    >
                      Tham gia thử thách
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
