"use client";

import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";

import "swiper/css";

const testimonials = [
  {
    name: "Minh Anh",
    avatar: "A",
    text: "Bài học ngắn, dễ hiểu. Mình thích phần check từ vì có ví dụ rõ ràng.",
  },
  {
    name: "Hoàng Nam",
    avatar: "N",
    text: "Giao diện dễ gần nhưng không quá trẻ con. Mình học mỗi ngày được 10 phút.",
  },
  {
    name: "Linh Chi",
    avatar: "L",
    text: "Check bài giúp mình biết sai ở đâu, rất hợp cho người tự học.",
  },
  {
    name: "Tuấn Kiệt",
    avatar: "K",
    text: "Lộ trình học rõ ràng, mỗi ngày chỉ cần hoàn thành vài nhiệm vụ nhỏ.",
  },
  {
    name: "Hà My",
    avatar: "M",
    text: "MiuLingo tạo cảm giác học nhẹ nhàng hơn, không bị áp lực như trước.",
  },
];

export default function TestimonialsSection() {
  return (
    <section className="border-y border-[#ead8c2] bg-[#fff8f2] py-24">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mx-auto mb-14 max-w-3xl text-center">
          <p className="mb-4 text-sm font-extrabold uppercase tracking-[0.25em] text-[#ff6b00]">
            Đánh giá học viên
          </p>

          <h2 className="text-4xl font-extrabold text-[#1f2a44] sm:text-5xl">
            Người học nói gì về MiuLingo?
          </h2>

          <p className="mt-5 text-lg leading-8 text-[#5b6b85]">
            Đánh giá giúp trang chủ đáng tin hơn và phù hợp với mọi nhóm người dùng.
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
                  ★★★★★
                </div>

                <p className="mt-5 min-h-[88px] text-base leading-8 text-[#5b6b85]">
                  “{item.text}”
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