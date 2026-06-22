const roadmapSteps = [
  {
    number: "1",
    title: "Làm quen",
    desc: "Học từ vựng, phát âm và mẫu câu cơ bản.",
  },
  {
    number: "2",
    title: "Thực hành",
    desc: "Luyện nghe, check từ, làm quiz và nói lại mẫu câu.",
  },
  {
    number: "3",
    title: "Tiến bộ",
    desc: "Theo dõi XP, level, bài đã học và khóa học phù hợp tiếp theo.",
  },
];

export function RoadmapSection() {
  return (
    <section className="border-b border-[#ead8c2] bg-[#fff8f2] py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <p className="mb-4 text-sm font-extrabold uppercase tracking-[0.25em] text-[#ff6b00]">
            Lộ trình học
          </p>

          <h2 className="text-4xl font-extrabold tracking-tight text-[#1f2a44] sm:text-5xl">
            Học đơn giản theo từng bước
          </h2>

          <p className="mt-5 text-lg leading-8 text-[#5b6b85]">
            Không làm người dùng bị ngợp. Mỗi ngày chỉ cần học một nhiệm vụ nhỏ.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {roadmapSteps.map((item) => (
            <div
              key={item.number}
              className="rounded-[26px] border border-[#ead8c2] bg-[#fffaf5] p-7 shadow-[0_24px_70px_rgba(31,42,68,0.06)]"
            >
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1f2a44] text-lg font-extrabold text-white">
                {item.number}
              </div>

              <h3 className="text-2xl font-extrabold text-[#1f2a44]">
                {item.title}
              </h3>

              <p className="mt-4 text-base leading-8 text-[#5b6b85]">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}