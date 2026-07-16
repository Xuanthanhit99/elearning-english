import { LeaderboardPageClient } from "@/src/Components/leaderboard/LeaderboardPageClient";
import { LeaderboardShell } from "@/src/Components/leaderboard/LeaderboardShell";


/*
 * Thay hai giá trị dưới bằng auth/session hiện tại của dự án.
 * Ví dụ đọc từ server session hoặc cookie.
 */
export default async function LeaderboardPage() {

  return (
    <LeaderboardShell>
      <LeaderboardPageClient/>
    </LeaderboardShell>
  );
}
