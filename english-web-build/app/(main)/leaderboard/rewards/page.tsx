'use client';

import { useEffect, useState } from 'react';
import { Gift, Loader2 } from 'lucide-react';
import {
  claimLeaderboardReward,
  getLeaderboardRewards,
} from '@/src/lib/leaderboard-api';

export default function LeaderboardRewardsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try { setItems(await getLeaderboardRewards()); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-3xl font-black">Phần thưởng xếp hạng</h1>
      <div className="mt-6 space-y-4">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-4 rounded-2xl border bg-white p-4 shadow-sm">
            <div className="rounded-2xl bg-violet-100 p-3"><Gift className="text-violet-600" /></div>
            <div className="min-w-0 flex-1">
              <p className="font-bold">{item.reward.title}</p>
              <p className="text-sm text-slate-500">{item.reward.description}</p>
            </div>
            <button
              disabled={item.status !== 'AVAILABLE'}
              onClick={async () => { await claimLeaderboardReward(item.id); await load(); }}
              className="rounded-xl bg-violet-600 px-4 py-2 font-bold text-white disabled:bg-slate-300"
            >
              {item.status === 'AVAILABLE' ? 'Nhận' : item.status}
            </button>
          </div>
        ))}
        {!items.length && <p className="rounded-2xl bg-slate-100 p-8 text-center text-slate-500">Chưa có phần thưởng.</p>}
      </div>
    </main>
  );
}
