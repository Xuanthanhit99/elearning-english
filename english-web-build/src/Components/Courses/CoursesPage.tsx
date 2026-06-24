// src/Components/Courses/CoursesPage.tsx
"use client";

import { useAuthStore } from "@/src/store/authStore";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

const categories = [
  { label: "Tất cả", value: "all", count: 12 },
  { label: "Học miễn phí", value: "free", count: 4 },
  { label: "Tiếng Anh cơ bản", value: "basic", count: 3 },
  { label: "Luyện nói", value: "speaking", count: 3 },
  { label: "Ngữ pháp", value: "grammar", count: 2 },
  { label: "Công việc", value: "work", count: 2 },
];

const filters = ["Tất cả", "Miễn phí", "Beginner", "Speaking"];

const courses = [
  {
    title: "English Starter",
    subtitle: "Tiếng Anh cho người mới",
    desc: "Học phát âm, từ vựng và mẫu câu cơ bản mỗi ngày.",
    tag: "Beginner • Free",
    level: "A0-A1",
    rating: "4.9",
    lessons: 32,
    students: "1.240",
    price: "Miễn phí",
    category: "free",
    icon: "GB",
    bg: "bg-[#fff4e8]",
  },
  {
    title: "Speaking Daily",
    subtitle: "Luyện nói giao tiếp",
    desc: "Shadowing, tình huống giao tiếp và phản xạ nói hằng ngày.",
    tag: "Speaking • Practice",
    level: "A1-A2",
    rating: "4.8",
    lessons: 28,
    students: "980",
    price: "599K",
    category: "speaking",
    icon: "🗣️",
    bg: "bg-[#eef8f2]",
  },
  {
    title: "Grammar Clear",
    subtitle: "Ngữ pháp ứng dụng",
    desc: "Học ngữ pháp qua câu thật, lỗi thường gặp và bài tập.",
    tag: "Grammar • Check bài",
    level: "A1-B1",
    rating: "4.8",
    lessons: 24,
    students: "820",
    price: "499K",
    category: "grammar",
    icon: "📝",
    bg: "bg-[#fff7ed]",
  },
  {
    title: "Work English",
    subtitle: "Tiếng Anh công việc",
    desc: "Email, họp, phỏng vấn và giao tiếp nơi làm việc.",
    tag: "Business • Work",
    level: "A2-B1",
    rating: "4.9",
    lessons: 30,
    students: "740",
    price: "799K",
    category: "work",
    icon: "💼",
    bg: "bg-[#f4f2fb]",
  },
  {
    title: "Vocabulary Boost",
    subtitle: "Tăng vốn từ vựng",
    desc: "Học từ theo chủ đề, ví dụ, IPA và cụm từ thường dùng.",
    tag: "Vocabulary • IPA",
    level: "A1-B1",
    rating: "4.7",
    lessons: 26,
    students: "1.050",
    price: "399K",
    category: "basic",
    icon: "🔤",
    bg: "bg-[#eef6ff]",
  },
  {
    title: "Pronunciation Lab",
    subtitle: "Luyện phát âm",
    desc: "Luyện âm khó, trọng âm, ngữ điệu và nói theo mẫu.",
    tag: "Pronunciation • AI",
    level: "A1-B1",
    rating: "4.8",
    lessons: 22,
    students: "690",
    price: "499K",
    category: "speaking",
    icon: "🎙️",
    bg: "bg-[#f0fdf4]",
  },
];

export default function CoursesPage() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeFilter, setActiveFilter] = useState("Tất cả");
  const [keyword, setKeyword] = useState("");
  const user = useAuthStore((state) => state.user);
  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      const matchCategory =
        activeCategory === "all" || course.category === activeCategory;

      const matchSearch =
        course.title.toLowerCase().includes(keyword.toLowerCase()) ||
        course.subtitle.toLowerCase().includes(keyword.toLowerCase()) ||
        course.desc.toLowerCase().includes(keyword.toLowerCase());

      const matchFilter =
        activeFilter === "Tất cả" ||
        course.tag.toLowerCase().includes(activeFilter.toLowerCase()) ||
        course.price.toLowerCase().includes(activeFilter.toLowerCase());

      return matchCategory && matchSearch && matchFilter;
    });
  }, [activeCategory, activeFilter, keyword]);

  return (
    <main className="min-h-screen bg-[#fff4e8] px-4 py-14">
      <section className="mx-auto max-w-7xl">
<div className="grid items-center gap-10 lg:grid-cols-[1.25fr_0.75fr]">
  <div>
    <div className="mb-5 inline-flex rounded-full border border-[#ffd4ad] bg-white px-4 py-2 text-sm font-extrabold text-[#ff6b00] shadow-sm">
      🎓 Khóa học MiuLingo
    </div>

    <h1 className="max-w-4xl text-5xl font-extrabold leading-tight text-[#1f2a44] lg:text-6xl">
      Chọn khóa học theo{" "}
      <span className="text-[#ff6b00]">mục tiêu học tập</span>
    </h1>

    <p className="mt-5 max-w-3xl text-lg leading-8 text-[#5b6b85]">
      Khám phá các khóa học được thiết kế theo lộ trình rõ ràng, bài học ngắn,
      dễ theo dõi và phù hợp cho người mới bắt đầu đến người đi làm.
    </p>
  </div>

  <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#1f2a44] via-[#514778] to-[#6b5796] p-6 text-white shadow-[0_24px_70px_rgba(31,42,68,0.16)]">
    <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/15" />
    <div className="absolute bottom-5 right-20 h-24 w-24 animate-[courseFloat_3s_ease-in-out_infinite] rounded-full bg-[#ff6b00]/25 blur-2xl" />

    <div className="relative z-10">
      <div className="mb-5 inline-flex rounded-full bg-[#fff0dc] px-4 py-2 text-sm font-extrabold text-[#ff6b00]">
        🎁 Ưu đãi tháng này
      </div>

      <h2 className="max-w-sm text-3xl font-extrabold leading-tight">
        Giảm 35% cho khóa Speaking
      </h2>

      <p className="mt-4 max-w-md text-sm font-medium leading-7 text-white/85">
        Đăng ký trong tuần này để nhận ưu đãi cho các khóa luyện nói và phát âm.
      </p>

      <div className="mt-6 flex items-center gap-3">
        <CountBox value="02" label="ngày" />
        <CountBox value="14" label="giờ" />
        <CountBox value="30" label="phút" />

        <button className="ml-auto rounded-full bg-[#ff6b00] px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-orange-950/20 transition hover:bg-[#e85f00]">
          Xem ưu đãi
        </button>
      </div>
    </div>
  </div>
</div>

<div className="mt-8 grid gap-4 md:grid-cols-3">
  <HeroStat value="12+" label="khóa học đang mở" />
  <HeroStat value="4.9/5" label="đánh giá trung bình" />
  <HeroStat value="3.200+" label="học viên đã tham gia" />
</div>

        <div className="mt-12 flex flex-col gap-4 lg:flex-row">
          <div className="relative flex-1">
            <span className="absolute left-5 top-1/2 -translate-y-1/2">🔎</span>
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Tìm khóa học: giao tiếp, phát âm, ngữ pháp, business..."
              className="w-full rounded-2xl border border-[#ead8c2] bg-white py-4 pl-12 pr-5 font-bold text-[#1f2a44] outline-none focus:border-[#ff6b00]"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            {filters.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setActiveFilter(item)}
                className={`rounded-2xl px-5 py-4 font-extrabold ${
                  activeFilter === item
                    ? "bg-[#1f2a44] text-white"
                    : "border border-[#ead8c2] bg-white text-[#5b6b85]"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[220px_1fr]">
          <aside className="h-fit rounded-[24px] border border-[#ead8c2] bg-white p-4 shadow-[0_24px_70px_rgba(31,42,68,0.06)]">
            <h3 className="mb-3 font-extrabold text-[#1f2a44]">Danh mục</h3>

            <div className="space-y-2">
              {categories.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setActiveCategory(item.value)}
                  className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left font-extrabold ${
                    activeCategory === item.value
                      ? "bg-[#f7f1fb] text-[#1f2a44]"
                      : "text-[#5b6b85] hover:bg-[#fff4e8]"
                  }`}
                >
                  <span>{item.label}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs">
                    {item.count}
                  </span>
                </button>
              ))}
            </div>
          </aside>

          <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredCourses.map((course) => (
              <CourseCard key={course.title} course={course} />
            ))}
          </section>
        </div>
      </section>
    </main>
  );
}

function CourseCard({ course }: { course: (typeof courses)[number] }) {
  return (
    <div className="overflow-hidden rounded-[24px] border border-[#ead8c2] bg-white shadow-[0_24px_70px_rgba(31,42,68,0.06)] transition hover:-translate-y-1 hover:shadow-[0_30px_80px_rgba(31,42,68,0.1)]">
      <div
        className={`flex h-36 items-center justify-between p-5 ${course.bg}`}
      >
        <div>
          <h3 className="text-2xl font-extrabold leading-7 text-[#1f2a44]">
            {course.title}
          </h3>

          <div className="mt-8 inline-flex rounded-full bg-white px-3 py-2 text-xs font-extrabold text-[#1f2a44] shadow-sm">
            {course.tag}
          </div>
        </div>

        <div className="text-5xl font-black text-[#1f2a44]">{course.icon}</div>
      </div>

      <div className="p-5">
        <div className="font-extrabold text-[#ff9900]">
          ★★★★★ {course.rating}
        </div>

        <div className="mt-3 flex items-start justify-between gap-3">
          <h4 className="text-xl font-extrabold leading-7 text-[#1f2a44]">
            {course.subtitle}
          </h4>

          <span className="rounded-full bg-[#f7f1fb] px-3 py-2 text-xs font-extrabold text-[#6b5796]">
            {course.level}
          </span>
        </div>

        <p className="mt-3 min-h-[72px] text-sm font-medium leading-7 text-[#5b6b85]">
          {course.desc}
        </p>

        <div className="mt-4 text-sm font-extrabold text-[#5b6b85]">
          {course.lessons} bài · {course.students} học viên · Quiz
        </div>

        <div className="mt-5 flex items-center justify-between">
          <span
            className={`text-2xl font-black ${
              course.price === "Miễn phí"
                ? "text-emerald-500"
                : "text-[#ff6b00]"
            }`}
          >
            {course.price}
          </span>

          <Link
            href="/courses/english-starter"
            className="rounded-full bg-[#1f2a44] px-5 py-3 font-extrabold text-white transition hover:bg-[#ff6b00]"
          >
            Chi tiết
          </Link>
        </div>
      </div>
    </div>
  );
}

function SuggestRow({
  icon,
  title,
  tag,
}: {
  icon: string;
  title: string;
  tag: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-[#ead8c2] bg-[#fffaf5] px-4 py-3 font-extrabold">
      <span className="text-[#1f2a44]">
        {icon} {title}
      </span>
      <span className="text-emerald-600">{tag}</span>
    </div>
  );
}

function CountBox({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-center backdrop-blur">
      <div className="text-lg font-extrabold text-white">{value}</div>
      <div className="mt-1 text-xs font-extrabold text-white/75">{label}</div>
    </div>
  );
}

function HeroStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-[#ead8c2] bg-white p-5 shadow-sm">
      <div className="text-2xl font-extrabold text-[#ff6b00]">{value}</div>
      <p className="mt-1 font-extrabold text-[#5b6b85]">{label}</p>
    </div>
  );
}
