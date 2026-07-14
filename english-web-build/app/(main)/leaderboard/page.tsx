import { Trophy } from "lucide-react";

const rows = [
  { name: "Minh Anh", xp: 5230, streak: 18 },
  { name: "Xuân Thành", xp: 4980, streak: 14 },
  { name: "Poppy Learner", xp: 4560, streak: 12 },
  { name: "English Hero", xp: 4210, streak: 10 },
];

export default function LeaderboardPage() {
  return (
    <main className="min-h-[calc(100vh-7rem)]">
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-500">
            <Trophy size={28} />
          </span>
          <div>
            <p className="text-sm font-black uppercase tracking-wider text-violet-600">
              Bảng xếp hạng
            </p>
            <h1 className="text-4xl font-black text-slate-950">
              Người học nổi bật
            </h1>
          </div>
        </div>
      </section>

      <section className="mt-6 overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
        {rows.map((row, index) => (
          <div
            key={row.name}
            className="flex items-center gap-4 border-b border-slate-100 px-5 py-4 last:border-b-0"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 font-black text-violet-700">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-black text-slate-950">{row.name}</p>
              <p className="text-sm font-semibold text-slate-500">
                {row.streak} ngày streak
              </p>
            </div>
            <p className="font-black text-violet-700">
              {row.xp.toLocaleString()} XP
            </p>
          </div>
        ))}
      </section>
    </main>
  );
}
