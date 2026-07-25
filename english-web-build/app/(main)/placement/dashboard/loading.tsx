import { BeaconVieSkeleton } from "@/src/Components/UI/BeaconVie";

export default function Loading() {
  return (
    <main className="min-h-screen px-4 py-6 sm:px-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Đang tải Placement Dashboard…</span>
      <div className="mx-auto max-w-[1500px] space-y-5">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(390px,0.95fr)]">
          <BeaconVieSkeleton className="h-[320px]" />
          <BeaconVieSkeleton className="h-[320px]" />
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <BeaconVieSkeleton className="h-[180px]" />
          <BeaconVieSkeleton className="h-[180px]" />
          <BeaconVieSkeleton className="h-[180px]" />
        </div>
      </div>
    </main>
  );
}
