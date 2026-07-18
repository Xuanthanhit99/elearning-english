export default function Loading() {
  return (
    <main className="min-h-screen bg-[#fff4e8] p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="h-16 animate-pulse rounded-[24px] bg-white/80" />
        <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
          <div className="space-y-5">
            <div className="h-64 animate-pulse rounded-[28px] bg-white/80" />
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="h-40 animate-pulse rounded-[24px] bg-white/80" />
              <div className="h-40 animate-pulse rounded-[24px] bg-white/80" />
            </div>
          </div>
          <div className="h-96 animate-pulse rounded-[28px] bg-white/80" />
        </div>
      </div>
    </main>
  );
}
