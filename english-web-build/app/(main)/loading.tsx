import Image from "next/image";

export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--background)] px-6">
      <Image
        src="/loho/icon.png"
        alt="Lumiverse"
        width={512}
        height={512}
        className="h-24 w-24 animate-bounce rounded-[22%]"
      />

      <p className="mt-6 text-center text-lg font-bold text-[var(--lumiverse-ink)]">
        Lumi đang chuẩn bị...
      </p>
    </div>
  );
}
