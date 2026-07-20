import { LumiverseSkeleton } from "@/src/Components/UI/Lumiverse";

export default function Loading() {
  return (
    <main className="min-h-screen px-3 py-5" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading placement preparation…</span>
      <div className="mx-auto grid max-w-7xl gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
        <LumiverseSkeleton className="h-[680px]" />
        <LumiverseSkeleton className="h-[680px]" />
      </div>
    </main>
  );
}
