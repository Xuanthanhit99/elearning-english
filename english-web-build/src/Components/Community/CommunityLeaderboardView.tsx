'use client';

import { Medal, Trophy } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getCommunityLeaderboard } from '@/src/lib/community-social-api';
import type { CommunityLeaderboardItem } from '@/src/types/community-social';

export function CommunityLeaderboardView() {
  const [period, setPeriod] = useState<
    'WEEKLY' | 'MONTHLY' | 'ALL_TIME'
  >('WEEKLY');
  const [items, setItems] = useState<CommunityLeaderboardItem[]>([]);

  useEffect(() => {
    void getCommunityLeaderboard(period).then(setItems);
  }, [period]);

  return (
    <div className="rounded-3xl border bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-amber-50 text-amber-600">
            <Trophy size={22} />
          </div>
          <div>
            <h2 className="text-xl font-bold">Bảng xếp hạng</h2>
            <p className="text-sm text-slate-500">
              Xếp hạng theo hoạt động trong cộng đồng.
            </p>
          </div>
        </div>

        <div className="flex rounded-xl bg-slate-100 p-1">
          {[
            ['WEEKLY', 'Tuần'],
            ['MONTHLY', 'Tháng'],
            ['ALL_TIME', 'Tất cả'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() =>
                setPeriod(
                  value as 'WEEKLY' | 'MONTHLY' | 'ALL_TIME',
                )
              }
              className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                period === value
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-500'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 divide-y">
        {items.map((item) => (
          <div
            key={item.user.id}
            className="flex items-center gap-3 py-3"
          >
            <div className="grid w-9 place-items-center font-bold text-slate-500">
              {item.rank <= 3 ? (
                <Medal
                  size={21}
                  className={
                    item.rank === 1
                      ? 'text-amber-500'
                      : item.rank === 2
                        ? 'text-slate-400'
                        : 'text-orange-500'
                  }
                />
              ) : (
                item.rank
              )}
            </div>
            <img
              src={item.user.avatar || '/avatar-placeholder.png'}
              alt=""
              className="h-11 w-11 rounded-full object-cover"
            />
            <div className="min-w-0 flex-1">
              <strong className="block truncate">
                {item.user.fullname}
              </strong>
              <span className="text-sm text-slate-500">
                Level {item.user.level}
              </span>
            </div>
            <strong className="text-indigo-600">
              {item.points} điểm
            </strong>
          </div>
        ))}
      </div>
    </div>
  );
}
