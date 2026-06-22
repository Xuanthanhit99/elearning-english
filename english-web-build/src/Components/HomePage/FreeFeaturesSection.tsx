const features = [
  {
    icon: "🎓",
    title: "Học miễn phí",
    desc: "Bài học mở về từ vựng, nghe ngắn, mẫu câu giao tiếp và quiz cơ bản.",
    bg: "bg-[#fff0dc]",
  },
  {
    icon: "📝",
    title: "Check bài miễn phí",
    desc: "Gửi đoạn văn ngắn để sửa lỗi ngữ pháp, từ vựng và cách diễn đạt.",
    bg: "bg-[#f3eefb]",
  },
  {
    icon: "🔤",
    title: "Check từ miễn phí",
    desc: "Tra nghĩa, IPA, ví dụ, phát âm và cụm từ thường dùng.",
    bg: "bg-[#e9fbf3]",
  },
];

export function FreeFeaturesSection() {
  return (
    <section className="border-y border-[#f2dfc8] bg-[#fffaf5] py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <p className="mb-4 text-sm font-extrabold uppercase tracking-[0.25em] text-[#ff6b00]">
            Tính năng miễn phí
          </p>

          <h2 className="text-4xl font-extrabold tracking-tight text-[#1f2a44] sm:text-5xl">
            Bắt đầu học mà không cần trả phí
          </h2>

          <p className="mt-5 text-lg leading-8 text-[#5b6b85]">
            Đưa các công cụ miễn phí lên trang chủ để người dùng có lý do đăng ký
            và quay lại hằng ngày.
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