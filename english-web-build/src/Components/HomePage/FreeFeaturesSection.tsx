const features = [
  {
    icon: "ðŸŽ“",
    title: "Há»c miá»…n phÃ­",
    desc: "BÃ i há»c má»Ÿ vá» tá»« vá»±ng, nghe ngáº¯n, máº«u cÃ¢u giao tiáº¿p vÃ  quiz cÆ¡ báº£n.",
    bg: "bg-[#fff0dc]",
  },
  {
    icon: "ðŸ“",
    title: "Check bÃ i miá»…n phÃ­",
    desc: "Gá»­i Ä‘oáº¡n vÄƒn ngáº¯n Ä‘á»ƒ sá»­a lá»—i ngá»¯ phÃ¡p, tá»« vá»±ng vÃ  cÃ¡ch diá»…n Ä‘áº¡t.",
    bg: "bg-[#f3eefb]",
  },
  {
    icon: "ðŸ”¤",
    title: "Check tá»« miá»…n phÃ­",
    desc: "Tra nghÄ©a, IPA, vÃ­ dá»¥, phÃ¡t Ã¢m vÃ  cá»¥m tá»« thÆ°á»ng dÃ¹ng.",
    bg: "bg-[#e9fbf3]",
  },
];

export function FreeFeaturesSection() {
  return (
    <section className="border-y border-[#f2dfc8] bg-[#fffaf5] py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <p className="mb-4 text-sm font-extrabold uppercase tracking-[0.25em] text-[#ff6b00]">
            TÃ­nh nÄƒng miá»…n phÃ­
          </p>

          <h2 className="text-4xl font-extrabold tracking-tight text-[#1f2a44] sm:text-5xl">
            Báº¯t Ä‘áº§u há»c mÃ  khÃ´ng cáº§n tráº£ phÃ­
          </h2>

          <p className="mt-5 text-lg leading-8 text-[#5b6b85]">
            ÄÆ°a cÃ¡c cÃ´ng cá»¥ miá»…n phÃ­ lÃªn trang chá»§ Ä‘á»ƒ ngÆ°á»i dÃ¹ng cÃ³ lÃ½ do Ä‘Äƒng kÃ½
            vÃ  quay láº¡i háº±ng ngÃ y.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {features.map((item) => (
            <div
              key={item.title}
              className="rounded-[26px] border border-[#ead8c2] bg-white p-7 shadow-[0_24px_70px_rgba(31,42,68,0.06)]"
            >
              <div
                className={`mb-6 flex h-16 w-16 items-center justify-center rounded-2xl text-3xl ${item.bg}`}
              >
                {item.icon}
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