export default function Loading() {
  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="lumiverse-card lumiverse-shimmer h-16" />
        <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
          <div className="space-y-5">
            <div className="lumiverse-card lumiverse-shimmer h-64" />
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="lumiverse-card lumiverse-shimmer h-40" />
              <div className="lumiverse-card lumiverse-shimmer h-40" />
            </div>
          </div>
          <div className="lumiverse-card lumiverse-shimmer h-96" />
        </div>
      </div>
    </main>
  );
}
