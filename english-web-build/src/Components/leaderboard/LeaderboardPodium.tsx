import { formatXp } from "@/src/lib/leaderboard";
import { LeaderboardEntry } from "@/src/types/leaderboard";

export function LeaderboardPodium({
  entries,
}: {
  entries: LeaderboardEntry[];
}) {
  const first = entries[0];
  const second = entries[1];
  const third = entries[2];

  return (
    <section className="mt-6 rounded-3xl bg-white p-4 shadow-sm sm:p-6">
      <div className="grid grid-cols-3 items-end gap-2 sm:gap-4">
        <PodiumItem
          entry={second}
          medal="🥈"
          height="h-28 sm:h-36"
          order="order-1"
        />
        <PodiumItem
          entry={first}
          medal="🥇"
          height="h-36 sm:h-48"
          order="order-2"
          highlight
        />
        <PodiumItem
          entry={third}
          medal="🥉"
          height="h-24 sm:h-32"
          order="order-3"
        />
      </div>
    </section>
  );
}

function PodiumItem({
  entry,
  medal,
  height,
  order,
  highlight = false,
}: {
  entry?: LeaderboardEntry;
  medal: string;
  height: string;
  order: string;
  highlight?: boolean;
}) {
  return (
    <div className={`${order} text-center`}>
      <div
        className={[
          'mx-auto grid h-14 w-14 place-items-center overflow-hidden rounded-full border-4 bg-slate-100 text-xl sm:h-18 sm:w-18',
          highlight
            ? 'border-amber-300'
            : 'border-white shadow',
        ].join(' ')}
      >
        {entry?.user.avatarUrl ? (
          <img
            src={entry.user.avatarUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          entry?.user.displayName?.[0]?.toUpperCase() ??
          '?'
        )}
      </div>

      <p className="mt-2 truncate text-xs font-black sm:text-sm">
        {entry?.user.displayName ?? '—'}
      </p>

      <p className="text-[11px] font-bold text-violet-600 sm:text-xs">
        {entry ? `${formatXp(entry.periodXp)} XP` : '0 XP'}
      </p>

      <div
        className={[
          'mt-3 flex items-start justify-center rounded-t-2xl bg-gradient-to-b pt-3 text-2xl shadow-inner',
          height,
          highlight
            ? 'from-amber-300 to-amber-100'
            : 'from-violet-200 to-violet-50',
        ].join(' ')}
      >
        {medal}
      </div>
    </div>
  );
}
