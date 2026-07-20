import Image from "next/image";

export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--background)] px-6">
      <Image
        src="/cat-home.jpg"
        alt="Loading"
        width={120}
        height={120}
        className="animate-bounce rounded-full"
      />

      <p className="mt-6 text-center text-lg font-bold text-[var(--lumiverse-ink)]">
        Lumi đang chuẩn bị...
      </p>
    </div>
  );
}
