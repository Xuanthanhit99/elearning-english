import { formatXp, zoneLabel } from "@/src/lib/leaderboard";
import { LeaderboardEntry } from "@/src/types/leaderboard";


export function CurrentUserRankCard({
  entry,
}: {
  entry: LeaderboardEntry | null;
}) {
  if (!entry) return null;

  return (
    <section className="mt-6 rounded-3xl border border-violet-200 bg-violet-50 p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-violet-600 text-xl font-black text-white">
            #{entry.rank}
          </div>

          <div>
            <p className="text-sm font-bold text-violet-700">
              Vị trí của bạn
            </p>
            <p className="text-xl font-black">
              {formatXp(entry.periodXp)} XP
            </p>
          </div>
        </div>

        <div className="rounded-xl bg-white px-4 py-3 text-sm font-bold text-slate-600">
          {zoneLabel(entry.zone)}
        </div>
      </div>
    </section>
  );
}
