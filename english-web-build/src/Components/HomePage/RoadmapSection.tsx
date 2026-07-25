const roadmapSteps = [
  {
    number: "1",
    title: "LÃ m quen",
    desc: "Há»c tá»« vá»±ng, phÃ¡t Ã¢m vÃ  máº«u cÃ¢u cÆ¡ báº£n.",
  },
  {
    number: "2",
    title: "Thá»±c hÃ nh",
    desc: "Luyá»‡n nghe, check tá»«, lÃ m quiz vÃ  nÃ³i láº¡i máº«u cÃ¢u.",
  },
  {
    number: "3",
    title: "Tiáº¿n bá»™",
    desc: "Theo dÃµi XP, level, bÃ i Ä‘Ã£ há»c vÃ  khÃ³a há»c phÃ¹ há»£p tiáº¿p theo.",
  },
];

export function RoadmapSection() {
  return (
    <section className="border-b border-[#ead8c2] bg-[#fff8f2] py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <p className="mb-4 text-sm font-extrabold uppercase tracking-[0.25em] text-[#ff6b00]">
            Lá»™ trÃ¬nh há»c
          </p>

          <h2 className="text-4xl font-extrabold tracking-tight text-[#1f2a44] sm:text-5xl">
            Há»c Ä‘Æ¡n giáº£n theo tá»«ng bÆ°á»›c
          </h2>

          <p className="mt-5 text-lg leading-8 text-[#5b6b85]">
            KhÃ´ng lÃ m ngÆ°á»i dÃ¹ng bá»‹ ngá»£p. Má»—i ngÃ y chá»‰ cáº§n há»c má»™t nhiá»‡m vá»¥ nhá».
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