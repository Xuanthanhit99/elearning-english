import { LeaderboardPageClient } from '@/src/Components/leaderboard/LeaderboardPageClient';
import { LeaderboardShell } from '@/src/Components/leaderboard/LeaderboardShell';

export default async function LeaderboardPage() {
  return (
    <LeaderboardShell>
      <LeaderboardPageClient />
    </LeaderboardShell>
  );
}
