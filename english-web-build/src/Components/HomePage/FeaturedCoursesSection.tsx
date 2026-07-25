"use client";

import { useRef } from "react";
import Link from "next/link";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Navigation } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";

import "swiper/css";
import "swiper/css/navigation";

export default function FeaturedCoursesSection() {
  const prevRef = useRef<HTMLButtonElement | null>(null);
  const nextRef = useRef<HTMLButtonElement | null>(null);

  return (
    <section className="bg-[#fffaf5] py-24">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mx-auto mb-14 max-w-3xl text-center">
          <p className="mb-4 text-sm font-extrabold uppercase tracking-[0.25em] text-[#ff6b00]">
            KhÃ³a há»c ná»•i báº­t
          </p>

          <h2 className="text-4xl font-extrabold text-[#1f2a44] sm:text-5xl">
            ÄÆ°á»£c há»c viÃªn Ä‘Ã¡nh giÃ¡ cao
          </h2>
        </div>

        <div className="relative">
          <button
            ref={prevRef}
            type="button"
            className="absolute left-0 top-1/2 z-30 hidden h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#1f2a44] text-3xl font-bold text-white shadow-xl hover:bg-[#ff6b00] md:block"
          >
            â€¹
          </button>

          <button
            ref={nextRef}
            type="button"
            className="absolute right-0 top-1/2 z-30 hidden h-12 w-12 translate-x-1/2 -translate-y-1/2 rounded-full bg-[#1f2a44] text-3xl font-bold text-white shadow-xl hover:bg-[#ff6b00] md:block"
          >
            â€º
          </button>

          <Swiper
            modules={[Autoplay, Navigation]}
            loop={true}
            speed={5000}
            autoplay={{
              delay: 0,
              disableOnInteraction: false,
              pauseOnMouseEnter: true,
            }}
            navigation={{
              prevEl: prevRef.current,
              nextEl: nextRef.current,
            }}
            onBeforeInit={(swiper: SwiperType) => {
              if (
                typeof swiper.params.navigation !== "boolean" &&
                swiper.params.navigation
              ) {
                swiper.params.navigation.prevEl = prevRef.current;
                swiper.params.navigation.nextEl = nextRef.current;
              }
            }}
            grabCursor={true}
            spaceBetween={24}
            slidesPerView={1.1}
            breakpoints={{
              640: { slidesPerView: 1.5 },
              768: { slidesPerView: 2 },
              1024: { slidesPerView: 3 },
            }}
            className="course-swiper !pb-4"
          >
            {featuredCourses.map((course) => (
              <SwiperSlide key={course.title}>
                <CourseCard course={course} />
              </SwiperSlide>
            ))}
          </Swiper>
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/courses"
            className="inline-flex rounded-2xl bg-[#ff6b00] px-8 py-4 font-bold text-white shadow-lg shadow-orange-200 hover:bg-[#e85f00]"
          >
            Xem táº¥t cáº£ khÃ³a há»c
          </Link>
        </div>
      </div>
    </section>
  );
}

const featuredCourses = [
  {
    title: "English Starter",
    tag: "Beginner â€¢ Free lessons",
    rating: "4.9",
    lessons: 32,
    students: 1240,
    price: "Miá»…n phÃ­",
    color: "bg-[#fff4e8]",
    desc: "Tá»« máº¥t gá»‘c Ä‘áº¿n giao tiáº¿p cÆ¡ báº£n, phÃ¹ há»£p ngÆ°á»i má»›i báº¯t Ä‘áº§u.",
  },
  {
    title: "Speaking Daily",
    tag: "Speaking â€¢ Practice",
    rating: "4.8",
    lessons: 28,
    students: 980,
    price: "599K",
    color: "bg-[#eef8f2]",
    desc: "Luyá»‡n nÃ³i theo tÃ¬nh huá»‘ng háº±ng ngÃ y Ä‘á»ƒ tÄƒng pháº£n xáº¡ giao tiáº¿p.",
  },
  {
    title: "Work English",
    tag: "Business â€¢ Work",
    rating: "4.9",
    lessons: 30,
    students: 740,
    price: "799K",
    color: "bg-[#f4f2fb]",
    desc: "Tiáº¿ng Anh cho email, há»p, phá»ng váº¥n vÃ  giao tiáº¿p cÃ´ng viá»‡c.",
  },
  {
    title: "IELTS Basic",
    tag: "IELTS â€¢ Foundation",
    rating: "4.7",
    lessons: 36,
    students: 860,
    price: "699K",
    color: "bg-[#fff7ed]",
    desc: "XÃ¢y ná»n tá»« vá»±ng, ngá»¯ phÃ¡p vÃ  ká»¹ nÄƒng lÃ m bÃ i IELTS cÆ¡ báº£n.",
  },
  {
    title: "Grammar Boost",
    tag: "Grammar â€¢ Practice",
    rating: "4.8",
    lessons: 24,
    students: 650,
    price: "399K",
    color: "bg-[#f0f9ff]",
    desc: "Luyá»‡n ngá»¯ phÃ¡p thá»±c chiáº¿n qua vÃ­ dá»¥, bÃ i táº­p vÃ  sá»­a lá»—i thÆ°á»ng gáº·p.",
  },
];

function CourseCard({ course }: { course: (typeof featuredCourses)[number] }) {
  return (
    <div className="h-full overflow-hidden rounded-[28px] border border-[#ead8c2] bg-white shadow-[0_24px_70px_rgba(31,42,68,0.06)]">
      <div className={`h-44 p-6 ${course.color}`}>
        <h3 className="text-2xl font-extrabold text-[#1f2a44]">
          {course.title}
        </h3>

        <div className="mt-16 inline-flex rounded-full bg-white px-4 py-2 text-sm font-bold text-[#1f2a44] shadow-sm">
          {course.tag}
        </div>
      </div>

      <div className="p-6">
        <div className="font-bold text-[#ff9900]">â˜…â˜…â˜…â˜…â˜… {course.rating}</div>

        <p className="mt-4 min-h-[72px] text-lg leading-8 text-[#5b6b85]">
          {course.desc}
        </p>

        <div className="mt-4 font-semibold text-[#5b6b85]">
          {course.lessons} bÃ i há»c Â· {course.students} há»c viÃªn
        </div>

        <div className="mt-6 flex items-center justify-between">
          <span className="text-3xl font-extrabold text-[#ff6b00]">
            {course.price}
          </span>

          <button className="rounded-full bg-[#1f2a44] px-6 py-3 font-bold text-white hover:bg-[#ff6b00]">
            Chi tiáº¿t
          </button>
        </div>
      </div>
    </div>
  );
}