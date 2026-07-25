import { BeaconVieSkeleton } from "@/src/Components/UI/BeaconVie";

export default function Loading() {
  return (
    <main className="min-h-screen px-3 py-5" aria-busy="true" aria-live="polite">
      <span className="sr-only">Đang tải phần chuẩn bị kiểm tra trình độ...</span>
      <div className="mx-auto grid max-w-7xl gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
        <BeaconVieSkeleton className="h-[680px]" />
        <BeaconVieSkeleton className="h-[680px]" />
      </div>
    </main>
  );
}
