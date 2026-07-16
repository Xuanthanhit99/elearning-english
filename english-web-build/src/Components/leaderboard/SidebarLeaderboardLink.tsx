import Link from 'next/link';

export function SidebarLeaderboardLink() {
  return (
    <Link
      href="/leaderboard"
      className="flex items-center gap-3 rounded-xl px-3 py-2 font-bold text-slate-600 hover:bg-violet-50 hover:text-violet-700"
    >
      <span>🏆</span>
      <span>Bảng xếp hạng</span>
    </Link>
  );
}
