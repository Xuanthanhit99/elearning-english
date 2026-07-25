import Link from 'next/link';
import { LeaderboardRewardsPanel } from '@/src/Components/leaderboard/LeaderboardRewardsPanel';
import { LeaderboardShell } from '@/src/Components/leaderboard/LeaderboardShell';

export default function LeaderboardRewardsPage() {
  return (
    <LeaderboardShell>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <Link
            href="/leaderboard"
            className="text-sm font-bold text-violet-600"
          >
            â† Báº£ng xáº¿p háº¡ng
          </Link>
          <h1 className="mt-2 text-3xl font-black">
            Pháº§n thÆ°á»Ÿng
          </h1>
        </div>
        <div className="text-5xl">ðŸŽ</div>
      </div>

      <LeaderboardRewardsPanel />
    </LeaderboardShell>
  );
}
