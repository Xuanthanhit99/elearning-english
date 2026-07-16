'use client';

import {
  useCallback,
  useEffect,
  useState,
} from 'react';
import {
  claimLeaderboardReward,
  getLeaderboardRewards,
} from '@/api/leaderboard';
import type { LeaderboardReward } from '@/types/leaderboard';

export function LeaderboardRewardsPanel() {
  const [items, setItems] = useState<
    LeaderboardReward[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] =
    useState<string | null>(null);
  const [error, setError] =
    useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setItems(await getLeaderboardRewards());
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Không thể tải phần thưởng.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function claim(id: string) {
    try {
      setClaiming(id);
      await claimLeaderboardReward(id);
      await load();
    } finally {
      setClaiming(null);
    }
  }

  if (loading) {
    return (
      <div className="rounded-3xl bg-white p-8">
        Đang tải phần thưởng...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl bg-rose-50 p-8 text-rose-700">
        {error}
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="rounded-3xl bg-white p-10 text-center">
        <div className="text-5xl">🎁</div>
        <p className="mt-4 font-black">
          Chưa có phần thưởng
        </p>
        <p className="mt-2 text-sm text-slate-500">
          Hãy đạt thứ hạng cao trong tuần để nhận thưởng.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {items.map((item) => {
        const available =
          item.status === 'AVAILABLE';

        return (
          <article
            key={item.id}
            className="rounded-3xl bg-white p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase text-violet-600">
                  {item.season?.name ?? 'Leaderboard'}
                </p>
                <h2 className="mt-1 text-lg font-black">
                  {item.title}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {item.description}
                </p>
              </div>
              <div className="text-3xl">🎁</div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Reward text={`+${item.payload.xp} XP`} show={item.payload.xp > 0} />
              <Reward text={`+${item.payload.coins} coins`} show={item.payload.coins > 0} />
              <Reward text={`+${item.payload.food} food`} show={item.payload.food > 0} />
            </div>

            <button
              disabled={
                !available ||
                claiming === item.id
              }
              onClick={() => void claim(item.id)}
              className="mt-5 w-full rounded-xl bg-violet-600 px-4 py-3 font-black text-white disabled:bg-slate-300"
            >
              {claiming === item.id
                ? 'Đang nhận...'
                : statusLabel(item.status)}
            </button>
          </article>
        );
      })}
    </div>
  );
}

function Reward({
  text,
  show,
}: {
  text: string;
  show: boolean;
}) {
  if (!show) return null;

  return (
    <span className="rounded-full bg-violet-50 px-3 py-1 text-sm font-black text-violet-700">
      {text}
    </span>
  );
}

function statusLabel(
  status: LeaderboardReward['status'],
) {
  if (status === 'AVAILABLE') return 'Nhận thưởng';
  if (status === 'CLAIMED') return 'Đã nhận';
  if (status === 'EXPIRED') return 'Đã hết hạn';
  return 'Đã thu hồi';
}
