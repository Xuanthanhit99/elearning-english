'use client';

import Link from 'next/link';
import { useCountdown } from '@/src/hooks/useCountdown';
import {
  leagueIcons,
  leagueLabels,
} from '@/src/lib/leaderboard';
import type { LeaderboardPeriod } from '@/src/types/leaderboard';

export function LeaderboardHeader({
  period,
}: {
  period?: LeaderboardPeriod;
}) {
  const countdown = useCountdown(period?.endsAt ?? undefined);
  const league = period?.league ?? 'BRONZE';

  return (
    <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-indigo-600 to-cyan-500 p-5 text-white shadow-xl sm:p-7">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-white/75">
            Lumiverse League
          </p>

          <h1 className="mt-2 text-3xl font-black sm:text-4xl">
            Bảng xếp hạng
          </h1>

          <p className="mt-2 max-w-xl text-sm text-white/80 sm:text-base">
            Học đều mỗi ngày, tích lũy XP và tiến lên giải đấu cao hơn.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:min-w-[420px]">
          <div className="rounded-2xl bg-white/15 p-4 backdrop-blur">
            <p className="text-xs font-bold uppercase text-white/70">
              Giải hiện tại
            </p>
            <p className="mt-2 text-lg font-black">
              {leagueIcons[league]}{' '}
              {leagueLabels[league]}
            </p>
          </div>

          <div className="rounded-2xl bg-white/15 p-4 backdrop-blur">
            <p className="text-xs font-bold uppercase text-white/70">
              Kết thúc sau
            </p>
            <p className="mt-2 text-lg font-black">
              {countdown.label}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link
          href="/leaderboard/rewards"
          className="rounded-xl bg-white px-4 py-2 text-sm font-black text-violet-700"
        >
          🎁 Phần thưởng
        </Link>

        <Link
          href="/leaderboard/history"
          className="rounded-xl bg-white/15 px-4 py-2 text-sm font-black text-white backdrop-blur"
        >
          📚 Lịch sử
        </Link>
      </div>
    </section>
  );
}
