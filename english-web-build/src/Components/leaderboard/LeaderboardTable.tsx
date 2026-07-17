import {
  formatXp,
  movementLabel,
  zoneLabel,
} from '@/src/lib/leaderboard';
import type { LeaderboardEntry } from '@/src/types/leaderboard';

export function LeaderboardTable({
  entries,
}: {
  entries: LeaderboardEntry[];
}) {
  return (
    <section className="mt-6 overflow-hidden rounded-3xl bg-white shadow-sm">
      <div className="border-b px-5 py-4">
        <h2 className="text-lg font-black">
          Xếp hạng tuần này
        </h2>
      </div>

      <div className="divide-y">
        {entries.map((entry) => (
          <LeaderboardRow
            key={entry.user.id}
            entry={entry}
            active={entry.isCurrentUser === true}
          />
        ))}
      </div>
    </section>
  );
}

function LeaderboardRow({
  entry,
  active,
}: {
  entry: LeaderboardEntry;
  active: boolean;
}) {
  const movement = movementLabel(entry);

  return (
    <article
      className={[
        'grid grid-cols-[46px_1fr_auto] items-center gap-3 px-4 py-4 sm:grid-cols-[60px_1fr_120px_110px]',
        active
          ? 'bg-violet-50'
          : 'bg-white',
      ].join(' ')}
    >
      <div className="text-center text-lg font-black">
        {entry.rank <= 3
          ? ['🥇', '🥈', '🥉'][entry.rank - 1]
          : `#${entry.rank}`}
      </div>

      <div className="flex min-w-0 items-center gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-slate-100 font-black">
          {entry.user.avatarUrl ? (
            <img
              src={entry.user.avatarUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            entry.user.displayName?.[0]?.toUpperCase()
          )}
        </div>

        <div className="min-w-0">
          <p className="truncate font-black">
            {entry.user.displayName}
            {active ? ' (Bạn)' : ''}
          </p>

          <p className="truncate text-xs text-slate-500">
            {entry.user.learnedToday
              ? '🟢 Đã học hôm nay'
              : '⚪ Chưa học hôm nay'}
            {entry.user.streak
              ? ` · 🔥 ${entry.user.streak}`
              : ''}
          </p>
        </div>
      </div>

      <div className="text-right">
        <p className="font-black text-violet-700">
          {formatXp(entry.periodXp)} XP
        </p>
        <p
          className={[
            'text-xs font-bold sm:hidden',
            movement.direction === 'up'
              ? 'text-emerald-600'
              : movement.direction === 'down'
                ? 'text-rose-600'
                : 'text-slate-400',
          ].join(' ')}
        >
          {movement.text}
        </p>
      </div>

      <div className="hidden text-center text-xs font-bold text-slate-500 sm:block">
        {zoneLabel(entry.zone)}
      </div>
    </article>
  );
}
