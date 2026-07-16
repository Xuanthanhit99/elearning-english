'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { api } from '@/src/lib/axios';


const unwrap = (response: any) =>
  response.data?.data ?? response.data;

export default function SocialLeaderboardPanel() {
  const [scope, setScope] = useState<'FRIENDS' | 'CLUB'>('FRIENDS');
  const [clubs, setClubs] = useState<any[]>([]);
  const [clubId, setClubId] = useState('');
  const [data, setData] = useState<any>({ entries: [] });
  const [activity, setActivity] = useState<any[]>([]);

  useEffect(() => {
    api.get('/leaderboards/social/my-clubs').then((res) => {
      const rows = unwrap(res);
      setClubs(rows);
      if (rows.length) setClubId(rows[0].id);
    });
  }, []);

  useEffect(() => {
    async function load() {
      if (scope === 'FRIENDS') {
        const [rank, feed] = await Promise.all([
          api.get('/leaderboards/social/friends'),
          api.get('/leaderboards/social/activity/friends'),
        ]);
        setData(unwrap(rank));
        setActivity(unwrap(feed));
      } else if (clubId) {
        const [rank, feed] = await Promise.all([
          api.get(`/leaderboards/social/clubs/${clubId}`),
          api.get(`/leaderboards/social/activity/clubs/${clubId}`),
        ]);
        setData(unwrap(rank));
        setActivity(unwrap(feed));
      } else {
        setData({
          entries: [],
          message: 'Bạn chưa tham gia câu lạc bộ nào.',
        });
        setActivity([]);
      }
    }

    load();
  }, [scope, clubId]);

  return (
    <section className="space-y-5">
      <div className="flex gap-2 rounded-2xl border bg-white p-2">
        <button
          onClick={() => setScope('FRIENDS')}
          className={`rounded-xl px-4 py-3 font-bold ${
            scope === 'FRIENDS'
              ? 'bg-violet-600 text-white'
              : 'text-slate-600'
          }`}
        >
          Bạn bè
        </button>
        <button
          onClick={() => setScope('CLUB')}
          className={`rounded-xl px-4 py-3 font-bold ${
            scope === 'CLUB'
              ? 'bg-violet-600 text-white'
              : 'text-slate-600'
          }`}
        >
          Câu lạc bộ
        </button>
      </div>

      {scope === 'CLUB' && clubs.length > 0 && (
        <select
          value={clubId}
          onChange={(e) => setClubId(e.target.value)}
          className="w-full rounded-xl border bg-white px-4 py-3"
        >
          {clubs.map((club) => (
            <option key={club.id} value={club.id}>
              {club.name} · {club.memberCount} thành viên
            </option>
          ))}
        </select>
      )}

      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="overflow-hidden rounded-3xl border bg-white">
          <div className="border-b p-5">
            <h2 className="text-xl font-black">
              {scope === 'FRIENDS'
                ? 'Xếp hạng bạn bè'
                : 'Xếp hạng câu lạc bộ'}
            </h2>
            <p className="text-sm text-slate-500">
              Thành viên chưa hoạt động vẫn hiển thị với 0 XP.
            </p>
          </div>

          {data.entries?.map((entry: any) => (
            <div
              key={entry.user.id}
              className="flex items-center gap-3 border-b p-4 last:border-0"
            >
              <span className="w-10 text-center font-black text-slate-500">
                #{entry.rank}
              </span>

              {entry.user.avatarUrl ? (
                <img
                  src={entry.user.avatarUrl}
                  alt={entry.user.displayName}
                  className="h-11 w-11 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-violet-100 font-black text-violet-700">
                  {entry.user.displayName.slice(0, 1).toUpperCase()}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">
                  {entry.user.displayName}
                </p>
                <p className="text-xs text-slate-500">
                  Level {entry.user.level}
                  {entry.user.streak
                    ? ` · 🔥 ${entry.user.streak}`
                    : ''}
                </p>
                <p
                  className={`text-xs font-semibold ${
                    entry.user.learnedToday
                      ? 'text-emerald-600'
                      : 'text-slate-400'
                  }`}
                >
                  {entry.user.learnedToday
                    ? 'Đã học hôm nay'
                    : 'Chưa học hôm nay'}
                </p>
              </div>

              <strong className="text-violet-700">
                {entry.periodXp.toLocaleString()} XP
              </strong>
            </div>
          ))}

          {!data.entries?.length && (
            <div className="p-10 text-center text-slate-500">
              {data.message ?? 'Chưa có dữ liệu.'}
            </div>
          )}
        </div>

        <aside className="rounded-3xl border bg-white p-5">
          <h3 className="font-black">Hoạt động gần đây</h3>

          <div className="mt-4 space-y-4">
            {activity.map((item) => (
              <div key={item.id} className="text-sm">
                <p>
                  <strong>{item.user.fullname}</strong>{' '}
                  {item.title}
                </p>
                <p className="text-xs text-slate-500">
                  {item.xp ? `+${item.xp} XP · ` : ''}
                  {new Date(item.createdAt).toLocaleString()}
                </p>
              </div>
            ))}

            {!activity.length && (
              <p className="text-sm text-slate-500">
                Chưa có hoạt động mới.
              </p>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}
