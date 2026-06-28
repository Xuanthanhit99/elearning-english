import LearningPetPanel from "@/src/Components/Pets/LearningPetPanel";

export default function PetPage() {
  return (
    <main className="min-h-screen bg-[#fff4e8] px-4 py-10">
      <section className="mx-auto max-w-7xl">
        <div className="mb-6">
          <p className="text-sm font-extrabold uppercase tracking-wide text-[#ff6b00]">
            Học tiếng Anh & nuôi thú cưng
          </p>
          <h1 className="mt-2 text-4xl font-black text-[#1f2a44]">
            Bạn đồng hành học tập
          </h1>
          <p className="mt-3 max-w-3xl text-lg font-bold leading-8 text-[#5b6b85]">
            Hoàn thành bài học để nhận XP, coin, food, duy trì streak và dùng phần thưởng để chăm sóc thú cưng.
          </p>
        </div>

        <LearningPetPanel />
      </section>
    </main>
  );
}
