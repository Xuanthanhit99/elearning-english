'use client';

import {
  leagueIcons,
  leagueLabels,
} from '@/src/lib/leaderboard';
import type { WeeklyResultPayload } from '@/src/types/leaderboard';

export function WeeklyResultModal({
  result,
  onClose,
}: {
  result: WeeklyResultPayload | null;
  onClose: () => void;
}) {
  if (!result) return null;

  const title = result.promoted
    ? 'Báº¡n Ä‘Ã£ thÄƒng háº¡ng!'
    : result.relegated
      ? 'Káº¿t quáº£ tuáº§n'
      : 'Báº¡n Ä‘Ã£ giá»¯ háº¡ng!';

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <section className="w-full max-w-md rounded-3xl bg-white p-6 text-center shadow-2xl">
        <div className="text-6xl">
          {result.promoted
            ? 'ðŸš€'
            : result.relegated
              ? 'ðŸ“‰'
              : 'ðŸ›¡ï¸'}
        </div>

        <h2 className="mt-4 text-2xl font-black">
          {title}
        </h2>

        <p className="mt-2 text-sm text-slate-500">
          Báº¡n Ä‘á»©ng háº¡ng #{result.rank} vá»›i{' '}
          {result.periodXp.toLocaleString('vi-VN')} XP.
        </p>

        <div className="mt-6 rounded-2xl bg-violet-50 p-5">
          <p className="text-sm font-bold text-slate-500">
            Giáº£i Ä‘áº¥u
          </p>
          <p className="mt-2 text-xl font-black">
            {leagueIcons[result.league]}{' '}
            {leagueLabels[result.league]}
          </p>
          <p className="my-2">â†“</p>
          <p className="text-xl font-black text-violet-700">
            {leagueIcons[result.nextLeague]}{' '}
            {leagueLabels[result.nextLeague]}
          </p>
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full rounded-xl bg-violet-600 px-4 py-3 font-black text-white"
        >
          Tiáº¿p tá»¥c
        </button>
      </section>
    </div>
  );
}
