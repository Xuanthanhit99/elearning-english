import Image from "next/image";

export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--background)] px-6">
      <Image
        src="/brand/beaconvie-ai-mascot.png"
        alt="Đang tải"
        width={120}
        height={120}
        className="animate-bounce rounded-full"
      />

      <p className="mt-6 text-center text-lg font-bold text-[var(--BeaconVie-ink)]">
        Beacon đang chuẩn bị...
      </p>
    </div>
  );
}

