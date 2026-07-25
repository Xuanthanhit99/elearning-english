"use client";

import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";

import "swiper/css";

const testimonials = [
  {
    name: "Minh Anh",
    avatar: "A",
    text: "BÃ i há»c ngáº¯n, dá»… hiá»ƒu. MÃ¬nh thÃ­ch pháº§n check tá»« vÃ¬ cÃ³ vÃ­ dá»¥ rÃµ rÃ ng.",
  },
  {
    name: "HoÃ ng Nam",
    avatar: "N",
    text: "Giao diá»‡n dá»… gáº§n nhÆ°ng khÃ´ng quÃ¡ tráº» con. MÃ¬nh há»c má»—i ngÃ y Ä‘Æ°á»£c 10 phÃºt.",
  },
  {
    name: "Linh Chi",
    avatar: "L",
    text: "Check bÃ i giÃºp mÃ¬nh biáº¿t sai á»Ÿ Ä‘Ã¢u, ráº¥t há»£p cho ngÆ°á»i tá»± há»c.",
  },
  {
    name: "Tuáº¥n Kiá»‡t",
    avatar: "K",
    text: "Lá»™ trÃ¬nh há»c rÃµ rÃ ng, má»—i ngÃ y chá»‰ cáº§n hoÃ n thÃ nh vÃ i nhiá»‡m vá»¥ nhá».",
  },
  {
    name: "HÃ  My",
    avatar: "M",
    text: "BeaconVie táº¡o cáº£m giÃ¡c há»c nháº¹ nhÃ ng hÆ¡n, khÃ´ng bá»‹ Ã¡p lá»±c nhÆ° trÆ°á»›c.",
  },
];

export default function TestimonialsSection() {
  return (
    <section className="border-y border-[#ead8c2] bg-[#fff8f2] py-24">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mx-auto mb-14 max-w-3xl text-center">
          <p className="mb-4 text-sm font-extrabold uppercase tracking-[0.25em] text-[#ff6b00]">
            ÄÃ¡nh giÃ¡ há»c viÃªn
          </p>

          <h2 className="text-4xl font-extrabold text-[#1f2a44] sm:text-5xl">
            NgÆ°á»i há»c nÃ³i gÃ¬ vá» BeaconVie?
          </h2>

          <p className="mt-5 text-lg leading-8 text-[#5b6b85]">
            ÄÃ¡nh giÃ¡ giÃºp trang chá»§ Ä‘Ã¡ng tin hÆ¡n vÃ  phÃ¹ há»£p vá»›i má»i nhÃ³m ngÆ°á»i dÃ¹ng.
          </p>
        </div>

        <Swiper
          modules={[Autoplay]}
          loop
          speed={5500}
          autoplay={{
            delay: 0,
            disableOnInteraction: false,
            pauseOnMouseEnter: true,
          }}
          allowTouchMove
          spaceBetween={24}
          slidesPerView={1.1}
          breakpoints={{
            640: { slidesPerView: 1.4 },
            768: { slidesPerView: 2 },
            1024: { slidesPerView: 3 },
          }}
          className="testimonial-swiper !pb-4"
        >
          {testimonials.map((item) => (
            <SwiperSlide key={item.name}>
              <div className="h-full rounded-[26px] border border-[#ead8c2] bg-white p-7 shadow-[0_24px_70px_rgba(31,42,68,0.06)]">
                <div className="text-xl font-extrabold text-[#ff9900]">
                  â˜…â˜…â˜…â˜…â˜…
                </div>

                <p className="mt-5 min-h-[88px] text-base leading-8 text-[#5b6b85]">
                  â€œ{item.text}â€
                </p>

                <div className="mt-6 flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#fff0dc] font-extrabold text-[#1f2a44]">
                    {item.avatar}
                  </div>

                  <h3 className="font-extrabold text-[#1f2a44]">
                    {item.name}
                  </h3>
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  );
}
