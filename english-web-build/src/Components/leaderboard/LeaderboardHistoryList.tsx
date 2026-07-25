import {
  formatXp,
  leagueIcons,
  leagueLabels,
} from '@/src/lib/leaderboard';
import type { LeaderboardHistoryItem } from '@/src/types/leaderboard';

export function LeaderboardHistoryList({
  items,
}: {
  items: LeaderboardHistoryItem[];
}) {
  if (!items.length) {
    return (
      <div className="rounded-3xl bg-white p-10 text-center">
        <div className="text-5xl">ðŸ“š</div>
        <p className="mt-4 font-black">
          ChÆ°a cÃ³ lá»‹ch sá»­ mÃ¹a giáº£i
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <article
          key={item.id}
          className="rounded-3xl bg-white p-5 shadow-sm"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase text-slate-400">
                {item.seasonName ??
                  `Season ${item.seasonId.slice(0, 8)}`}
              </p>
              <p className="mt-2 text-lg font-black">
                {leagueIcons[item.league]}{' '}
                {leagueLabels[item.league]}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <Metric
                label="Háº¡ng"
                value={`#${item.finalRank}`}
              />
              <Metric
                label="XP"
                value={formatXp(item.periodXp)}
              />
              <Metric
                label="Káº¿t quáº£"
                value={
                  item.promoted
                    ? 'ThÄƒng'
                    : item.relegated
                      ? 'Xuá»‘ng'
                      : 'Giá»¯'
                }
              />
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 px-4 py-3">
      <p className="text-xs text-slate-500">
        {label}
      </p>
      <p className="mt-1 font-black">
        {value}
      </p>
    </div>
  );
}
