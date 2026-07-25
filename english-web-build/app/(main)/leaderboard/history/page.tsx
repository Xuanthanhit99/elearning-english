import Link from 'next/link';
import { getLeaderboardHistory } from '@/src/lib/leaderboard-api';
import { LeaderboardHistoryList } from '@/src/Components/leaderboard/LeaderboardHistoryList';
import { LeaderboardShell } from '@/src/Components/leaderboard/LeaderboardShell';

export default async function LeaderboardHistoryPage() {
  let items = [];

  try {
    items = await getLeaderboardHistory();
  } catch {
    items = [];
  }

  return (
    <LeaderboardShell>
      <div className="mb-6">
        <Link
          href="/leaderboard"
          className="text-sm font-bold text-violet-600"
        >
          â† Báº£ng xáº¿p háº¡ng
        </Link>
        <h1 className="mt-2 text-3xl font-black">
          Lá»‹ch sá»­ mÃ¹a giáº£i
        </h1>
      </div>

      <LeaderboardHistoryList items={items} />
    </LeaderboardShell>
  );
}
