"use client";

import {
  Mic,
  Star,
  Heart,
  Clock,
  Volume2,
  Lightbulb,
} from "lucide-react";

const situations = [
  {
    id: 1,
    title: "Gá»i mÃ³n táº¡i nhÃ  hÃ ng",
    desc: "Thá»±c hÃ nh gá»i mÃ³n, há»i giÃ¡ vÃ  yÃªu cáº§u Ä‘áº·c biá»‡t táº¡i nhÃ  hÃ ng.",
    level: "Dá»…",
    time: "5 - 7 phÃºt",
    users: "1.2k lÆ°á»£t luyá»‡n",
    progress: 85,
    img: "https://images.unsplash.com/photo-1551218808-94e220e084d2?w=500",
  },
  {
    id: 2,
    title: "LÃ m thá»§ tá»¥c táº¡i sÃ¢n bay",
    desc: "Thá»±c hÃ nh há»™i thoáº¡i khi lÃ m thá»§ tá»¥c check-in chuyáº¿n bay.",
    level: "Trung bÃ¬nh",
    time: "6 - 8 phÃºt",
    users: "982 lÆ°á»£t luyá»‡n",
    progress: 78,
    img: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=500",
  },
  {
    id: 3,
    title: "Phá»ng váº¥n xin viá»‡c",
    desc: "Tráº£ lá»i cÃ¡c cÃ¢u há»i thÆ°á»ng gáº·p trong buá»•i phá»ng váº¥n.",
    level: "KhÃ³",
    time: "7 - 10 phÃºt",
    users: "756 lÆ°á»£t luyá»‡n",
    progress: 92,
    img: "https://images.unsplash.com/photo-1556761175-b413da4baf72?w=500",
  },
  {
    id: 4,
    title: "Äi khÃ¡m bÃ¡c sÄ©",
    desc: "MÃ´ táº£ triá»‡u chá»©ng vÃ  nghe hÆ°á»›ng dáº«n tá»« bÃ¡c sÄ©.",
    level: "Dá»…",
    time: "5 - 7 phÃºt",
    users: "643 lÆ°á»£t luyá»‡n",
    progress: 80,
    img: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=500",
  },
  {
    id: 5,
    title: "Mua sáº¯m quáº§n Ã¡o",
    desc: "Há»i size, mÃ u sáº¯c, giÃ¡ cáº£ vÃ  thanh toÃ¡n khi mua sáº¯m.",
    level: "Dá»…",
    time: "5 - 7 phÃºt",
    users: "1.1k lÆ°á»£t luyá»‡n",
    progress: 76,
    img: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=500",
  },
  {
    id: 6,
    title: "Nháº­n phÃ²ng khÃ¡ch sáº¡n",
    desc: "Thá»±c hÃ nh há»™i thoáº¡i khi nháº­n phÃ²ng vÃ  há»i thÃ´ng tin khÃ¡ch sáº¡n.",
    level: "Trung bÃ¬nh",
    time: "6 - 8 phÃºt",
    users: "812 lÆ°á»£t luyá»‡n",
    progress: 82,
    img: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500",
  },
  {
    id: 7,
    title: "Há»i Ä‘Æ°á»ng",
    desc: "Há»i Ä‘Æ°á»ng vÃ  chá»‰ dáº«n cÃ¡ch Ä‘áº¿n má»™t Ä‘á»‹a Ä‘iá»ƒm.",
    level: "Dá»…",
    time: "4 - 6 phÃºt",
    users: "921 lÆ°á»£t luyá»‡n",
    progress: 88,
    img: "https://images.unsplash.com/photo-1524661135-423995f22d0b?w=500",
  },
  {
    id: 8,
    title: "Káº¿t báº¡n má»›i",
    desc: "Giá»›i thiá»‡u báº£n thÃ¢n vÃ  trÃ² chuyá»‡n vá»›i ngÆ°á»i báº¡n má»›i.",
    level: "Dá»…",
    time: "4 - 6 phÃºt",
    users: "1.3k lÆ°á»£t luyá»‡n",
    progress: 90,
    img: "https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?w=500",
  },
];

const categories = [
  "Táº¥t cáº£ tÃ¬nh huá»‘ng",
  "Háº±ng ngÃ y",
  "Du lá»‹ch",
  "Mua sáº¯m",
  "CÃ´ng viá»‡c",
  "Há»c táº­p",
  "Y táº¿",
  "KhÃ¡c",
];

export default function SpeakingSituationsPage() {
  return (
    <div className="min-h-screen bg-[#fbfaff] text-[#121447]">
      <div className="flex">

        <main className="flex-1">

          <div className="grid grid-cols-[1fr_420px] gap-8 px-10 py-8">
            <section>
              <div className="mb-6 text-sm font-bold text-slate-500">
                Trang chá»§ &nbsp;â€º&nbsp; NÃ³i &nbsp;â€º&nbsp;
                <span className="text-[#121447]"> NÃ³i theo tÃ¬nh huá»‘ng</span>
              </div>

              <div className="mb-7 flex items-center justify-between">
                <div>
                  <h2 className="flex items-center gap-3 text-4xl font-black">
                    NÃ³i theo tÃ¬nh huá»‘ng <Mic className="text-violet-600" />
                  </h2>
                  <p className="mt-3 text-lg text-slate-500">
                    Luyá»‡n nÃ³i tiáº¿ng Anh thÃ´ng qua cÃ¡c tÃ¬nh huá»‘ng giao tiáº¿p thá»±c táº¿.
                  </p>
                </div>

                <div className="flex items-center gap-5">
                  <div className="rounded-2xl border border-violet-200 bg-violet-50 px-5 py-4 text-sm font-bold">
                    CÃ¹ng luyá»‡n nÃ³i má»—i ngÃ y Ä‘á»ƒ tá»± tin hÆ¡n nhÃ©!
                  </div>
                  <div className="text-8xl">ðŸ¦Š</div>
                </div>
              </div>

              <div className="mb-8 flex flex-wrap gap-4">
                {categories.map((item, index) => (
                  <button
                    key={item}
                    className={`rounded-xl border px-5 py-3 text-sm font-bold ${
                      index === 0
                        ? "border-violet-200 bg-violet-100 text-violet-700"
                        : "border-violet-200 bg-white"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>

              <h3 className="mb-5 text-xl font-black">Chá»n tÃ¬nh huá»‘ng Ä‘á»ƒ luyá»‡n nÃ³i</h3>

              <div className="grid grid-cols-4 gap-5">
                {situations.map((item) => (
                  <SituationCard key={item.id} item={item} />
                ))}
              </div>

              <div className="mt-8 rounded-3xl bg-violet-50 p-6">
                <h3 className="mb-5 text-2xl font-black text-violet-700">
                  Máº¹o luyá»‡n nÃ³i hiá»‡u quáº£
                </h3>

                <div className="grid grid-cols-4 gap-6">
                  <Tip icon={<Lightbulb />} title="Nghe ká»¹ cÃ¢u há»i vÃ  hiá»ƒu yÃªu cáº§u." />
                  <Tip icon={<Volume2 />} title="NÃ³i rÃµ rÃ ng, phÃ¡t Ã¢m tá»± nhiÃªn." />
                  <Tip icon={<Mic />} title="Sá»­ dá»¥ng tá»« vá»±ng vÃ  cáº¥u trÃºc Ä‘Ã£ há»c." />
                  <Tip icon={<Star />} title="Tá»± tin vÃ  Ä‘á»«ng ngáº¡i máº¯c lá»—i!" />
                </div>
              </div>
            </section>

            <aside className="space-y-6">
              <ProgressCard />
              <RecentCard />
              <SuggestCard />
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}

function SituationCard({ item }: any) {
  const levelStyle =
    item.level === "KhÃ³"
      ? "bg-red-100 text-red-600"
      : item.level === "Trung bÃ¬nh"
      ? "bg-orange-100 text-orange-600"
      : "bg-green-100 text-green-600";

  return (
    <div className="overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
      <div className="relative h-30">
        <img src={item.img} alt={item.title} className="h-full w-full object-cover" />
        <button className="absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-white">
          <Heart size={18} />
        </button>
      </div>

      <div className="p-4">
        <h4 className="font-black">
          {item.id}. {item.title}
        </h4>
        <p className="mt-2 min-h-[42px] text-sm leading-6 text-slate-500">{item.desc}</p>

        <div className="mt-4 flex items-center gap-2 text-xs font-bold">
          <span className={`rounded-lg px-2 py-1 ${levelStyle}`}>{item.level}</span>
          <span className="flex items-center gap-1 text-slate-500">
            <Clock size={13} /> {item.time}
          </span>
          <span className="text-slate-500">{item.users}</span>
        </div>

        <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-violet-300 py-3 font-black text-violet-700 hover:bg-violet-600 hover:text-white">
          Báº¯t Ä‘áº§u <Mic size={16} />
        </button>
      </div>
    </div>
  );
}

function ProgressCard() {
  return (
    <div className="rounded-3xl border border-violet-100 bg-white p-6 shadow-sm">
      <h3 className="text-xl font-black">Tiáº¿n Ä‘á»™ nÃ³i</h3>

      <div className="mx-auto my-8 grid size-40 place-items-center rounded-full border-[14px] border-violet-100 border-r-violet-700 border-t-violet-700">
        <div className="text-center">
          <div className="text-4xl font-black">40%</div>
          <div className="text-sm font-bold">HoÃ n thÃ nh</div>
        </div>
      </div>

      <div className="grid grid-cols-3 text-center">
        <SmallStat icon="ðŸŽ™ï¸" value="12" label="TÃ¬nh huá»‘ng" />
        <SmallStat icon="â­" value="48" label="BÃ i Ä‘Ã£ hoÃ n thÃ nh" />
        <SmallStat icon="â±ï¸" value="6h 30m" label="Tá»•ng thá»i gian" />
      </div>
    </div>
  );
}

function RecentCard() {
  return (
    <div className="rounded-3xl border border-violet-100 bg-white p-6 shadow-sm">
      <h3 className="mb-5 text-xl font-black">ThÃ nh tÃ­ch gáº§n Ä‘Ã¢y</h3>

      {situations.slice(0, 3).map((item) => (
        <div key={item.id} className="mb-4 flex items-center gap-4">
          <img src={item.img} className="size-14 rounded-xl object-cover" />
          <div className="flex-1">
            <div className="font-bold">{item.title}</div>
            <div className="text-xs text-slate-500">HÃ´m nay, 09:15</div>
          </div>
          <div className="rounded-lg bg-green-100 px-3 py-1 font-bold text-green-600">
            {item.progress}%
          </div>
        </div>
      ))}

      <button className="rounded-xl border border-violet-300 px-6 py-3 font-bold text-violet-700">
        Xem táº¥t cáº£
      </button>
    </div>
  );
}

function SuggestCard() {
  return (
    <div className="rounded-3xl bg-violet-50 p-6">
      <h3 className="mb-5 text-xl font-black">Gá»£i Ã½ cho báº¡n</h3>
      <div className="rounded-2xl bg-white p-5">
        <div className="font-black text-violet-700">ðŸŽ§ TÃ¬nh huá»‘ng phÃ¹ há»£p vá»›i báº¡n</div>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          Dá»±a trÃªn trÃ¬nh Ä‘á»™ hiá»‡n táº¡i, chÃºng tÃ´i gá»£i Ã½ báº¡n luyá»‡n thÃªm cÃ¡c tÃ¬nh huá»‘ng Du lá»‹ch.
        </p>
        <button className="mt-5 rounded-xl border border-violet-300 px-6 py-3 font-bold text-violet-700">
          KhÃ¡m phÃ¡ ngay
        </button>
      </div>
    </div>
  );
}

function SmallStat({ icon, value, label }: any) {
  return (
    <div>
      <div className="text-2xl">{icon}</div>
      <div className="mt-2 font-black">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}

function Tip({ icon, title }: any) {
  return (
    <div className="flex items-center gap-4">
      <div className="grid size-14 place-items-center rounded-full bg-white text-violet-600">
        {icon}
      </div>
      <div className="text-sm font-bold leading-6">{title}</div>
    </div>
  );
}