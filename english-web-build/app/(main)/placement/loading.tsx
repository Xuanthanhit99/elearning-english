import { BeaconVieSkeleton } from "@/src/Components/UI/BeaconVie";

export default function Loading() {
  return (
    <main className="min-h-[70vh] px-4 py-10" aria-busy="true" aria-live="polite">
      <span className="sr-only">Đang tải trạng thái kiểm tra trình độ...</span>
      <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <BeaconVieSkeleton className="h-[360px]" />
        <BeaconVieSkeleton className="h-[360px]" />
      </div>
    </main>
  );
}
