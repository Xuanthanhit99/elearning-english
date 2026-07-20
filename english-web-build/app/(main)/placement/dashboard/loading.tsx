import { LumiverseSkeleton } from "@/src/Components/UI/Lumiverse";

export default function Loading() {
  return (
    <main className="min-h-screen px-4 py-6 sm:px-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Đang tải Placement Dashboard…</span>
      <div className="mx-auto max-w-[1500px] space-y-5">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(390px,0.95fr)]">
          <LumiverseSkeleton className="h-[320px]" />
          <LumiverseSkeleton className="h-[320px]" />
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <LumiverseSkeleton className="h-[180px]" />
          <LumiverseSkeleton className="h-[180px]" />
          <LumiverseSkeleton className="h-[180px]" />
        </div>
      </div>
    </main>
  );
}
